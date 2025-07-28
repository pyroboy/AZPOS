import { getContext } from 'telefunc';
import { 
  receiptGenerationSchema,
  receiptFiltersSchema,
  receiptCustomizationSchema,
  receiptPreviewSchema,
  type GeneratedReceipt,
  type ReceiptGeneration,
  type ReceiptFilters,
  type PaginatedReceipts,
  type ReceiptStats,
  type ReceiptTemplate,
  type ReceiptCustomization,
  type ReceiptPreview
} from '$lib/types/receipt.schema';
import { createSupabaseClient } from '$lib/server/db';

// Helper function to generate receipt number
function generateReceiptNumber(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `RCP-${timestamp.slice(-6)}-${random}`;
}

// Telefunc to generate receipt
export async function onGenerateReceipt(receiptData: unknown): Promise<GeneratedReceipt> {
  const { user } = getContext();
  if (!user) throw new Error('Not authenticated');

  const validatedData = receiptGenerationSchema.parse(receiptData);
  const supabase = createSupabaseClient();

  // Get transaction details
  const { data: transaction, error: transactionError } = await supabase
    .from('transactions')
    .select('*')
    .eq('id', validatedData.transaction_id)
    .single();

  if (transactionError || !transaction) {
    throw new Error('Transaction not found');
  }

  // Get receipt template
  let template;
  if (validatedData.template_id) {
    const { data: templateData, error: templateError } = await supabase
      .from('receipt_templates')
      .select('*')
      .eq('id', validatedData.template_id)
      .single();

    if (templateError) {
      throw new Error('Receipt template not found');
    }
    template = templateData;
  } else {
    // Get default template
    const { data: defaultTemplate, error: defaultError } = await supabase
      .from('receipt_templates')
      .select('*')
      .eq('is_default', true)
      .single();

    if (defaultError) {
      // Use system default if no template found
      template = getDefaultReceiptTemplate();
    } else {
      template = defaultTemplate;
    }
  }

  // Get business info
  const { data: settings } = await supabase
    .from('settings')
    .select('business')
    .single();

  const businessInfo = settings?.business || getDefaultBusinessInfo();

  // Generate receipt content
  const receiptContent = generateReceiptContent(transaction, template, businessInfo);
  const receiptNumber = generateReceiptNumber();
  const now = new Date().toISOString();

  const generatedReceipt: GeneratedReceipt = {
    id: crypto.randomUUID(),
    receipt_number: receiptNumber,
    transaction_id: validatedData.transaction_id,
    template_id: template.id,
    format: validatedData.format,
    content: receiptContent,
    delivery_method: validatedData.delivery_method,
    delivery_status: 'pending',
    recipient: validatedData.recipient,
    generated_at: now
  };

  // Process delivery
  try {
    await processReceiptDelivery(generatedReceipt, validatedData);
    generatedReceipt.delivery_status = 'sent';
    generatedReceipt.delivered_at = now;
  } catch (error) {
    generatedReceipt.delivery_status = 'failed';
    generatedReceipt.error_message = error instanceof Error ? error.message : 'Delivery failed';
  }

  // Save receipt record
  const { data: savedReceipt, error: saveError } = await supabase
    .from('generated_receipts')
    .insert({
      id: generatedReceipt.id,
      receipt_number: generatedReceipt.receipt_number,
      transaction_id: generatedReceipt.transaction_id,
      template_id: generatedReceipt.template_id,
      format: generatedReceipt.format,
      content: generatedReceipt.content,
      delivery_method: generatedReceipt.delivery_method,
      delivery_status: generatedReceipt.delivery_status,
      recipient: generatedReceipt.recipient,
      generated_at: generatedReceipt.generated_at,
      delivered_at: generatedReceipt.delivered_at,
      error_message: generatedReceipt.error_message,
      generated_by: user.id
    })
    .select()
    .single();

  if (saveError) throw saveError;

  return generatedReceipt;
}

// Helper function to generate receipt content
function generateReceiptContent(transaction: any, template: any, businessInfo: any): string {
  const sections = template.sections;
  let content = '';

  // Header section
  if (sections.header.show_business_name) {
    content += `${businessInfo.name}\n`;
  }
  if (sections.header.show_address) {
    content += `${businessInfo.address.street}\n`;
    content += `${businessInfo.address.city}, ${businessInfo.address.state} ${businessInfo.address.postal_code}\n`;
  }
  if (sections.header.show_contact && businessInfo.contact.phone) {
    content += `Phone: ${businessInfo.contact.phone}\n`;
  }
  if (sections.header.custom_text) {
    content += `${sections.header.custom_text}\n`;
  }
  content += '\n' + '='.repeat(40) + '\n\n';

  // Transaction info section
  if (sections.transaction_info.show_receipt_number) {
    content += `Receipt #: ${transaction.transaction_number}\n`;
  }
  if (sections.transaction_info.show_date_time) {
    const date = new Date(transaction.processed_at);
    content += `Date: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}\n`;
  }
  if (sections.transaction_info.show_cashier) {
    content += `Cashier: ${transaction.processed_by}\n`;
  }
  content += '\n';

  // Items section
  content += 'ITEMS:\n';
  content += '-'.repeat(40) + '\n';
  
  transaction.items.forEach((item: any) => {
    let itemLine = '';
    if (sections.items.show_description) {
      itemLine += `${item.product_name}`;
    }
    if (sections.items.show_quantity) {
      itemLine += ` x${item.quantity}`;
    }
    if (sections.items.show_unit_price) {
      itemLine += ` @ $${item.unit_price.toFixed(2)}`;
    }
    if (sections.items.show_total_price) {
      itemLine += ` = $${item.total_amount.toFixed(2)}`;
    }
    content += `${itemLine}\n`;
    
    // Show modifiers if enabled
    if (sections.items.show_modifiers && item.modifiers) {
      item.modifiers.forEach((modifier: any) => {
        content += `  + ${modifier.modifier_name}\n`;
      });
    }
  });
  content += '\n';

  // Totals section
  if (sections.totals.show_subtotal) {
    content += `Subtotal: $${transaction.subtotal.toFixed(2)}\n`;
  }
  if (sections.totals.show_discounts && transaction.discount_amount > 0) {
    content += `Discount: -$${transaction.discount_amount.toFixed(2)}\n`;
  }
  if (sections.totals.show_tax_breakdown) {
    content += `Tax: $${transaction.tax_amount.toFixed(2)}\n`;
  }
  if (sections.totals.show_tip && transaction.tip_amount > 0) {
    content += `Tip: $${transaction.tip_amount.toFixed(2)}\n`;
  }
  content += '-'.repeat(40) + '\n';
  if (sections.totals.show_total) {
    content += `TOTAL: $${transaction.total_amount.toFixed(2)}\n`;
  }
  content += '\n';

  // Payment methods
  if (sections.totals.show_payment_methods) {
    content += 'PAYMENT:\n';
    transaction.payment_methods.forEach((payment: any) => {
      content += `${payment.type.toUpperCase()}: $${payment.amount.toFixed(2)}\n`;
    });
    content += '\n';
  }

  // Footer section
  if (sections.footer.show_thank_you) {
    content += 'Thank you for your business!\n';
  }
  if (sections.footer.custom_text) {
    content += `${sections.footer.custom_text}\n`;
  }

  return content;
}

// Helper function to process receipt delivery
async function processReceiptDelivery(receipt: GeneratedReceipt, options: ReceiptGeneration): Promise<void> {
  switch (options.delivery_method) {
    case 'print':
      // In a real implementation, this would send to printer
      console.log('Printing receipt:', receipt.receipt_number);
      break;
    case 'email':
      if (!options.recipient?.email) {
        throw new Error('Email address required for email delivery');
      }
      // In a real implementation, this would send email
      console.log('Emailing receipt to:', options.recipient.email);
      break;
    case 'sms':
      if (!options.recipient?.phone) {
        throw new Error('Phone number required for SMS delivery');
      }
      // In a real implementation, this would send SMS
      console.log('Sending SMS receipt to:', options.recipient.phone);
      break;
    case 'download':
      // Generate download URL (in real implementation)
      receipt.file_url = `https://example.com/receipts/${receipt.id}.pdf`;
      break;
  }
}

// Helper function to get default receipt template
function getDefaultReceiptTemplate(): any {
  return {
    id: 'default',
    name: 'Default Template',
    type: 'transaction',
    sections: {
      header: {
        show_logo: false,
        show_business_name: true,
        show_address: true,
        show_contact: true,
        show_tax_id: false
      },
      transaction_info: {
        show_receipt_number: true,
        show_transaction_number: true,
        show_date_time: true,
        show_cashier: true,
        show_customer_info: true
      },
      items: {
        show_sku: false,
        show_description: true,
        show_quantity: true,
        show_unit_price: true,
        show_total_price: true,
        show_discounts: true,
        show_modifiers: true
      },
      totals: {
        show_subtotal: true,
        show_discounts: true,
        show_tax_breakdown: true,
        show_tip: true,
        show_total: true,
        show_payment_methods: true,
        show_change: true
      },
      footer: {
        show_return_policy: false,
        show_thank_you: true,
        show_survey_info: false,
        show_social_media: false
      }
    }
  };
}

// Helper function to get default business info
function getDefaultBusinessInfo(): any {
  return {
    name: 'AZPOS Store',
    address: {
      street: '123 Main Street',
      city: 'Anytown',
      state: 'State',
      postal_code: '12345',
      country: 'United States'
    },
    contact: {
      phone: '(555) 123-4567',
      email: 'info@azpos.com'
    }
  };
}

// Telefunc to get paginated receipts
export async function onGetReceipts(filters?: ReceiptFilters): Promise<PaginatedReceipts> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();
  const validatedFilters = filters ? receiptFiltersSchema.parse(filters) : {};
  
  const page = validatedFilters.page || 1;
  const limit = validatedFilters.limit || 20;
  const offset = (page - 1) * limit;

  let query = supabase
    .from('generated_receipts')
    .select('*', { count: 'exact' });

  // Apply filters
  if (validatedFilters.search) {
    query = query.or(`receipt_number.ilike.%${validatedFilters.search}%`);
  }
  
  if (validatedFilters.transaction_id) {
    query = query.eq('transaction_id', validatedFilters.transaction_id);
  }
  
  if (validatedFilters.template_id) {
    query = query.eq('template_id', validatedFilters.template_id);
  }
  
  if (validatedFilters.format) {
    query = query.eq('format', validatedFilters.format);
  }
  
  if (validatedFilters.delivery_method) {
    query = query.eq('delivery_method', validatedFilters.delivery_method);
  }
  
  if (validatedFilters.delivery_status) {
    query = query.eq('delivery_status', validatedFilters.delivery_status);
  }
  
  if (validatedFilters.date_from) {
    query = query.gte('generated_at', validatedFilters.date_from);
  }
  
  if (validatedFilters.date_to) {
    query = query.lte('generated_at', validatedFilters.date_to);
  }

  // Apply sorting
  const sortBy = validatedFilters.sort_by || 'generated_at';
  const sortOrder = validatedFilters.sort_order || 'desc';
  query = query.order(sortBy, { ascending: sortOrder === 'asc' });

  // Apply pagination
  query = query.range(offset, offset + limit - 1);

  const { data: receipts, error, count } = await query;
  if (error) throw error;

  const totalPages = Math.ceil((count || 0) / limit);

  return {
    receipts: receipts || [],
    pagination: {
      page,
      limit,
      total: count || 0,
      total_pages: totalPages,
      has_more: page < totalPages
    }
  };
}

// Telefunc to get receipt statistics
export async function onGetReceiptStats(): Promise<ReceiptStats> {
  const { user } = getContext();
  if (!user || (user.role !== 'admin' && user.role !== 'manager')) {
    throw new Error('Not authorized - admin/manager access required');
  }

  const supabase = createSupabaseClient();

  const { data: receipts, error } = await supabase
    .from('generated_receipts')
    .select('format, delivery_method, delivery_status, generated_at');

  if (error) throw error;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const stats = receipts?.reduce((acc, receipt) => {
    acc.total_receipts++;
    
    const receiptDate = new Date(receipt.generated_at);
    if (receiptDate >= today) {
      acc.receipts_today++;
    }
    
    switch (receipt.delivery_method) {
      case 'print':
        acc.printed_receipts++;
        break;
      case 'email':
        acc.emailed_receipts++;
        break;
      case 'sms':
        acc.sms_receipts++;
        break;
      case 'download':
        acc.downloaded_receipts++;
        break;
    }
    
    if (receipt.delivery_status === 'failed') {
      acc.failed_deliveries++;
    }
    
    // Format breakdown
    if (!acc.format_breakdown[receipt.format]) {
      acc.format_breakdown[receipt.format] = { count: 0, percentage: 0 };
    }
    acc.format_breakdown[receipt.format].count++;
    
    return acc;
  }, {
    total_receipts: 0,
    receipts_today: 0,
    printed_receipts: 0,
    emailed_receipts: 0,
    sms_receipts: 0,
    downloaded_receipts: 0,
    failed_deliveries: 0,
    delivery_success_rate: 0,
    format_breakdown: {} as Record<string, any>
  }) || {
    total_receipts: 0,
    receipts_today: 0,
    printed_receipts: 0,
    emailed_receipts: 0,
    sms_receipts: 0,
    downloaded_receipts: 0,
    failed_deliveries: 0,
    delivery_success_rate: 0,
    format_breakdown: {}
  };

  // Calculate delivery success rate
  const successfulDeliveries = stats.total_receipts - stats.failed_deliveries;
  stats.delivery_success_rate = stats.total_receipts > 0 ? (successfulDeliveries / stats.total_receipts) * 100 : 0;

  // Calculate format percentages
  Object.keys(stats.format_breakdown).forEach(format => {
    stats.format_breakdown[format].percentage = 
      stats.total_receipts > 0 ? (stats.format_breakdown[format].count / stats.total_receipts) * 100 : 0;
  });

  return stats;
}
