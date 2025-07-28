import { z } from 'zod';

// Schema for receipt template
export const receiptTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['transaction', 'refund', 'gift_card', 'store_credit', 'layaway', 'quote']),
  is_default: z.boolean().default(false),
  is_active: z.boolean().default(true),
  layout: z.object({
    width: z.number().default(80), // Characters or mm
    font_size: z.enum(['small', 'medium', 'large']).default('medium'),
    alignment: z.enum(['left', 'center', 'right']).default('left'),
    margins: z.object({
      top: z.number().default(0),
      bottom: z.number().default(0),
      left: z.number().default(0),
      right: z.number().default(0)
    }).optional()
  }),
  sections: z.object({
    header: z.object({
      show_logo: z.boolean().default(true),
      show_business_name: z.boolean().default(true),
      show_address: z.boolean().default(true),
      show_contact: z.boolean().default(true),
      show_tax_id: z.boolean().default(false),
      custom_text: z.string().optional()
    }),
    transaction_info: z.object({
      show_receipt_number: z.boolean().default(true),
      show_transaction_number: z.boolean().default(true),
      show_date_time: z.boolean().default(true),
      show_cashier: z.boolean().default(true),
      show_customer_info: z.boolean().default(true),
      date_format: z.string().default('MM/DD/YYYY HH:mm')
    }),
    items: z.object({
      show_sku: z.boolean().default(false),
      show_description: z.boolean().default(true),
      show_quantity: z.boolean().default(true),
      show_unit_price: z.boolean().default(true),
      show_total_price: z.boolean().default(true),
      show_discounts: z.boolean().default(true),
      show_modifiers: z.boolean().default(true),
      group_by_category: z.boolean().default(false)
    }),
    totals: z.object({
      show_subtotal: z.boolean().default(true),
      show_discounts: z.boolean().default(true),
      show_tax_breakdown: z.boolean().default(true),
      show_tip: z.boolean().default(true),
      show_total: z.boolean().default(true),
      show_payment_methods: z.boolean().default(true),
      show_change: z.boolean().default(true)
    }),
    footer: z.object({
      show_return_policy: z.boolean().default(true),
      show_thank_you: z.boolean().default(true),
      show_survey_info: z.boolean().default(false),
      show_social_media: z.boolean().default(false),
      custom_text: z.string().optional(),
      show_barcode: z.boolean().default(false)
    })
  }),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime()
});

// Schema for business information on receipts
export const businessInfoSchema = z.object({
  name: z.string(),
  logo_url: z.string().url().optional(),
  address: z.object({
    street: z.string(),
    city: z.string(),
    state: z.string().optional(),
    postal_code: z.string().optional(),
    country: z.string()
  }),
  contact: z.object({
    phone: z.string().optional(),
    email: z.string().email().optional(),
    website: z.string().url().optional()
  }).optional(),
  tax_id: z.string().optional(),
  registration_number: z.string().optional(),
  return_policy: z.string().optional(),
  thank_you_message: z.string().optional()
});

// Schema for receipt generation request
export const receiptGenerationSchema = z.object({
  transaction_id: z.string(),
  template_id: z.string().optional(), // Use default if not provided
  format: z.enum(['thermal', 'pdf', 'html', 'email']).default('thermal'),
  delivery_method: z.enum(['print', 'email', 'sms', 'download']).default('print'),
  recipient: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional()
  }).optional(),
  options: z.object({
    include_signature_line: z.boolean().default(false),
    include_survey_qr: z.boolean().default(false),
    include_loyalty_info: z.boolean().default(false),
    copy_type: z.enum(['customer', 'merchant', 'duplicate']).default('customer')
  }).optional()
});

// Schema for generated receipt
export const generatedReceiptSchema = z.object({
  id: z.string(),
  receipt_number: z.string(),
  transaction_id: z.string(),
  template_id: z.string(),
  format: z.enum(['thermal', 'pdf', 'html', 'email']),
  content: z.string(), // Raw receipt content (text, HTML, or base64 PDF)
  file_url: z.string().url().optional(), // For PDF downloads
  delivery_method: z.enum(['print', 'email', 'sms', 'download']),
  delivery_status: z.enum(['pending', 'sent', 'delivered', 'failed']),
  recipient: z.object({
    email: z.string().email().optional(),
    phone: z.string().optional()
  }).optional(),
  generated_at: z.string().datetime(),
  delivered_at: z.string().datetime().optional(),
  error_message: z.string().optional()
});

// Schema for receipt filters
export const receiptFiltersSchema = z.object({
  search: z.string().optional(), // Search by receipt number, transaction number
  transaction_id: z.string().optional(),
  template_id: z.string().optional(),
  format: z.enum(['thermal', 'pdf', 'html', 'email']).optional(),
  delivery_method: z.enum(['print', 'email', 'sms', 'download']).optional(),
  delivery_status: z.enum(['pending', 'sent', 'delivered', 'failed']).optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional(),
  sort_by: z.enum(['generated_at', 'receipt_number', 'delivery_status']).optional(),
  sort_order: z.enum(['asc', 'desc']).optional(),
  page: z.number().min(1).optional(),
  limit: z.number().min(1).max(100).optional()
});

// Schema for receipt statistics
export const receiptStatsSchema = z.object({
  total_receipts: z.number(),
  receipts_today: z.number(),
  printed_receipts: z.number(),
  emailed_receipts: z.number(),
  sms_receipts: z.number(),
  downloaded_receipts: z.number(),
  failed_deliveries: z.number(),
  delivery_success_rate: z.number(),
  format_breakdown: z.record(z.string(), z.object({
    count: z.number(),
    percentage: z.number()
  })),
  template_usage: z.array(z.object({
    template_id: z.string(),
    template_name: z.string(),
    usage_count: z.number(),
    percentage: z.number()
  })).optional(),
  hourly_generation: z.array(z.object({
    hour: z.number(),
    count: z.number()
  })).optional()
});

// Schema for paginated receipts
export const paginatedReceiptsSchema = z.object({
  receipts: z.array(generatedReceiptSchema),
  pagination: z.object({
    page: z.number(),
    limit: z.number(),
    total: z.number(),
    total_pages: z.number(),
    has_more: z.boolean()
  }),
  stats: receiptStatsSchema.optional()
});

// Schema for receipt customization
export const receiptCustomizationSchema = z.object({
  template_id: z.string(),
  customizations: z.object({
    header_text: z.string().optional(),
    footer_text: z.string().optional(),
    promotional_message: z.string().optional(),
    survey_url: z.string().url().optional(),
    social_media_handles: z.object({
      facebook: z.string().optional(),
      instagram: z.string().optional(),
      twitter: z.string().optional()
    }).optional(),
    loyalty_program_info: z.string().optional()
  })
});

// Schema for receipt preview
export const receiptPreviewSchema = z.object({
  template_id: z.string(),
  sample_data: z.object({
    transaction_number: z.string().default('TXN-123456'),
    items: z.array(z.object({
      name: z.string(),
      quantity: z.number(),
      price: z.number()
    })).optional(),
    total: z.number().default(100.00),
    payment_method: z.string().default('Cash')
  }).optional()
});

// Export inferred types
export type ReceiptTemplate = z.infer<typeof receiptTemplateSchema>;
export type BusinessInfo = z.infer<typeof businessInfoSchema>;
export type ReceiptGeneration = z.infer<typeof receiptGenerationSchema>;
export type GeneratedReceipt = z.infer<typeof generatedReceiptSchema>;
export type ReceiptFilters = z.infer<typeof receiptFiltersSchema>;
export type ReceiptStats = z.infer<typeof receiptStatsSchema>;
export type PaginatedReceipts = z.infer<typeof paginatedReceiptsSchema>;
export type ReceiptCustomization = z.infer<typeof receiptCustomizationSchema>;
export type ReceiptPreview = z.infer<typeof receiptPreviewSchema>;
