import { getContext } from 'telefunc';
import {
	supplierPerformanceFiltersSchema,
	type SupplierPerformanceReport,
	type SupplierPerformanceFilters,
	type SupplierPerformanceMetric,
	type PerformanceStats,
	type SupplierPerformanceDetail
} from '$lib/types/supplier-performance.schema';
import { createSupabaseClient } from '$lib/server/db';

// Helper function to calculate date range based on period
function calculateDateRange(
	period: string,
	customStart?: string,
	customEnd?: string
): { startDate: Date; endDate: Date; label: string } {
	const now = new Date();
	let startDate: Date;
	let endDate: Date = now;
	let label: string;

	switch (period) {
		case 'month': {
			startDate = new Date(now.getFullYear(), now.getMonth(), 1);
			label = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
			break;
		}
		case 'quarter': {
			const quarter = Math.floor(now.getMonth() / 3);
			startDate = new Date(now.getFullYear(), quarter * 3, 1);
			label = `Q${quarter + 1} ${now.getFullYear()}`;
			break;
		}
		case 'year': {
			startDate = new Date(now.getFullYear(), 0, 1);
			label = `${now.getFullYear()}`;
			break;
		}
		case 'custom': {
			if (!customStart || !customEnd) {
				throw new Error('Custom period requires start and end dates');
			}
			startDate = new Date(customStart);
			endDate = new Date(customEnd);
			label = `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
			break;
		}
		default: {
			startDate = new Date(now.getFullYear(), now.getMonth(), 1);
			label = `${now.toLocaleString('default', { month: 'long' })} ${now.getFullYear()}`;
		}
	}

	return { startDate, endDate, label };
}

// Helper function to calculate cost variance for purchase orders
function calculateCostVariance(items: any[]): {
	total: number;
	average: number;
	percentage: number;
} {
	if (!items || items.length === 0) {
		return { total: 0, average: 0, percentage: 0 };
	}

	let totalVariance = 0;
	let totalOrders = 0;
	let totalExpected = 0;
	let totalActual = 0;

	items.forEach((item) => {
		const expectedCost = item.quantity_ordered * item.unit_cost;
		const actualCost = item.quantity_received * item.unit_cost; // Simplified - in reality might have different costs
		const variance = actualCost - expectedCost;

		totalVariance += variance;
		totalExpected += expectedCost;
		totalActual += actualCost;
		totalOrders++;
	});

	const averageVariance = totalOrders > 0 ? totalVariance / totalOrders : 0;
	const variancePercentage = totalExpected > 0 ? (totalVariance / totalExpected) * 100 : 0;

	return {
		total: totalVariance,
		average: averageVariance,
		percentage: variancePercentage
	};
}

// Main telefunc to get supplier performance report
export async function onGetSupplierPerformanceReport(
	filters?: SupplierPerformanceFilters
): Promise<SupplierPerformanceReport> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'owner')) {
		throw new Error('Not authorized - admin/manager/owner access required');
	}

	const supabase = createSupabaseClient();
	const validatedFilters = filters ? supplierPerformanceFiltersSchema.parse(filters) : {};

	// Calculate date range
	const { startDate, endDate, label } = calculateDateRange(
		validatedFilters.period,
		validatedFilters.date_from,
		validatedFilters.date_to
	);

	// Get all suppliers with their purchase orders for the period
	let suppliersQuery = supabase.from('suppliers').select(`
      id,
      name,
      code,
      is_active,
      purchase_orders:purchase_orders(
        id,
        po_number,
        status,
        order_date,
        expected_delivery_date,
        actual_delivery_date,
        total_amount,
        items,
        created_at
      )
    `);

	// Apply supplier filters
	if (validatedFilters.supplier_ids && validatedFilters.supplier_ids.length > 0) {
		suppliersQuery = suppliersQuery.in('id', validatedFilters.supplier_ids);
	}

	if (!validatedFilters.include_inactive) {
		suppliersQuery = suppliersQuery.eq('is_active', true);
	}

	const { data: suppliers, error: suppliersError } = await suppliersQuery;
	if (suppliersError) throw suppliersError;

	// Get purchase orders for the specific period
	let ordersQuery = supabase
		.from('purchase_orders')
		.select('*')
		.gte('order_date', startDate.toISOString())
		.lte('order_date', endDate.toISOString());

	if (validatedFilters.supplier_ids && validatedFilters.supplier_ids.length > 0) {
		ordersQuery = ordersQuery.in('supplier_id', validatedFilters.supplier_ids);
	}

	const { data: allOrders, error: ordersError } = await ordersQuery;
	if (ordersError) throw ordersError;

	// Process metrics for each supplier
	const metrics: SupplierPerformanceMetric[] = [];
	let totalStats = {
		total_suppliers: 0,
		active_suppliers: 0,
		suppliers_with_orders: 0,
		total_on_time_deliveries: 0,
		total_late_deliveries: 0,
		total_order_value: 0,
		total_cost_variance: 0,
		total_purchase_orders: 0,
		completed_orders: 0,
		cancelled_orders: 0,
		pending_orders: 0,
		delivery_delays: [] as number[]
	};

	suppliers?.forEach((supplier) => {
		const supplierOrders = allOrders?.filter((order) => order.supplier_id === supplier.id) || [];

		// Count different order statuses
		const completedOrders = supplierOrders.filter((o) => o.status === 'received');
		const cancelledOrders = supplierOrders.filter((o) => o.status === 'cancelled');
		const pendingOrders = supplierOrders.filter((o) =>
			['draft', 'pending', 'approved', 'ordered', 'partially_received'].includes(o.status)
		);

		// Calculate delivery performance
		let onTimeDeliveries = 0;
		let lateDeliveries = 0;
		let totalDeliveryDelay = 0;

		completedOrders.forEach((order) => {
			if (order.expected_delivery_date && order.actual_delivery_date) {
				const expectedDate = new Date(order.expected_delivery_date);
				const actualDate = new Date(order.actual_delivery_date);

				if (actualDate <= expectedDate) {
					onTimeDeliveries++;
				} else {
					lateDeliveries++;
					const delayDays = Math.ceil(
						(actualDate.getTime() - expectedDate.getTime()) / (1000 * 60 * 60 * 24)
					);
					totalDeliveryDelay += delayDays;
					totalStats.delivery_delays.push(delayDays);
				}
			}
		});

		const totalDeliveries = onTimeDeliveries + lateDeliveries;
		const onTimeRate = totalDeliveries > 0 ? (onTimeDeliveries / totalDeliveries) * 100 : 0;
		const averageDeliveryDelay = lateDeliveries > 0 ? totalDeliveryDelay / lateDeliveries : 0;

		// Calculate financial metrics
		const totalOrderValue = supplierOrders.reduce((sum, order) => sum + order.total_amount, 0);
		const averageOrderValue =
			supplierOrders.length > 0 ? totalOrderValue / supplierOrders.length : 0;

		// Calculate cost variance (simplified - using all items from all orders)
		const allItems = supplierOrders.flatMap((order) => order.items || []);
		const costVariance = calculateCostVariance(allItems);

		// Find last order date
		const lastOrderDate =
			supplierOrders.length > 0
				? supplierOrders.reduce(
						(latest, order) =>
							new Date(order.order_date) > new Date(latest) ? order.order_date : latest,
						supplierOrders[0].order_date
					)
				: undefined;

		const daysSinceLastOrder = lastOrderDate
			? Math.floor(
					(new Date().getTime() - new Date(lastOrderDate).getTime()) / (1000 * 60 * 60 * 24)
				)
			: undefined;

		// Create supplier metric
		const metric: SupplierPerformanceMetric = {
			supplier_id: supplier.id,
			supplier_name: supplier.name,
			supplier_code: supplier.code,
			is_active: supplier.is_active,

			total_pos: supplierOrders.length,
			completed_pos: completedOrders.length,
			cancelled_pos: cancelledOrders.length,
			pending_pos: pendingOrders.length,

			on_time_deliveries: onTimeDeliveries,
			late_deliveries: lateDeliveries,
			on_time_rate: onTimeRate,
			average_delivery_delay: averageDeliveryDelay,

			total_order_value: totalOrderValue,
			average_order_value: averageOrderValue,
			cost_variance_total: costVariance.total,
			average_cost_variance: costVariance.average,
			cost_variance_percentage: costVariance.percentage,

			last_order_date: lastOrderDate,
			days_since_last_order: daysSinceLastOrder,

			period_start: startDate.toISOString(),
			period_end: endDate.toISOString()
		};

		metrics.push(metric);

		// Update total stats
		totalStats.total_suppliers++;
		if (supplier.is_active) totalStats.active_suppliers++;
		if (supplierOrders.length > 0) totalStats.suppliers_with_orders++;
		totalStats.total_on_time_deliveries += onTimeDeliveries;
		totalStats.total_late_deliveries += lateDeliveries;
		totalStats.total_order_value += totalOrderValue;
		totalStats.total_cost_variance += costVariance.total;
		totalStats.total_purchase_orders += supplierOrders.length;
		totalStats.completed_orders += completedOrders.length;
		totalStats.cancelled_orders += cancelledOrders.length;
		totalStats.pending_orders += pendingOrders.length;
	});

	// Sort metrics based on filters
	const sortField = validatedFilters.sort_by;
	const sortOrder = validatedFilters.sort_order;

	metrics.sort((a, b) => {
		let valueA: any;
		let valueB: any;

		switch (sortField) {
			case 'supplier_name':
				valueA = a.supplier_name.toLowerCase();
				valueB = b.supplier_name.toLowerCase();
				break;
			case 'on_time_rate':
				valueA = a.on_time_rate;
				valueB = b.on_time_rate;
				break;
			case 'cost_variance':
				valueA = a.average_cost_variance;
				valueB = b.average_cost_variance;
				break;
			case 'total_pos':
				valueA = a.total_pos;
				valueB = b.total_pos;
				break;
			default:
				valueA = a.supplier_name.toLowerCase();
				valueB = b.supplier_name.toLowerCase();
		}

		if (sortOrder === 'desc') {
			return valueA < valueB ? 1 : valueA > valueB ? -1 : 0;
		} else {
			return valueA > valueB ? 1 : valueA < valueB ? -1 : 0;
		}
	});

	// Calculate aggregated stats
	const totalDeliveries = totalStats.total_on_time_deliveries + totalStats.total_late_deliveries;
	const overallOnTimeRate =
		totalDeliveries > 0 ? (totalStats.total_on_time_deliveries / totalDeliveries) * 100 : 0;
	const averageDeliveryDelay =
		totalStats.delivery_delays.length > 0
			? totalStats.delivery_delays.reduce((sum, delay) => sum + delay, 0) /
				totalStats.delivery_delays.length
			: 0;
	const averageCostVariance =
		totalStats.total_suppliers > 0
			? totalStats.total_cost_variance / totalStats.total_suppliers
			: 0;

	// Get top and bottom performers
	const sortedByOnTime = [...metrics].sort((a, b) => b.on_time_rate - a.on_time_rate);
	const topPerformers = sortedByOnTime.slice(0, 5).map((m) => ({
		supplier_id: m.supplier_id,
		supplier_name: m.supplier_name,
		on_time_rate: m.on_time_rate
	}));
	const worstPerformers = sortedByOnTime
		.slice(-5)
		.reverse()
		.map((m) => ({
			supplier_id: m.supplier_id,
			supplier_name: m.supplier_name,
			on_time_rate: m.on_time_rate
		}));

	const stats: PerformanceStats = {
		total_suppliers: totalStats.total_suppliers,
		active_suppliers: totalStats.active_suppliers,
		suppliers_with_orders: totalStats.suppliers_with_orders,

		overall_on_time_rate: overallOnTimeRate,
		total_on_time_deliveries: totalStats.total_on_time_deliveries,
		total_late_deliveries: totalStats.total_late_deliveries,
		average_delivery_delay: averageDeliveryDelay,

		total_order_value: totalStats.total_order_value,
		total_cost_variance: totalStats.total_cost_variance,
		average_cost_variance: averageCostVariance,

		total_purchase_orders: totalStats.total_purchase_orders,
		completed_orders: totalStats.completed_orders,
		cancelled_orders: totalStats.cancelled_orders,
		pending_orders: totalStats.pending_orders,

		top_on_time_suppliers: topPerformers,
		worst_performers: worstPerformers
	};

	return {
		metrics,
		stats,
		period: {
			type: validatedFilters.period,
			start_date: startDate.toISOString(),
			end_date: endDate.toISOString(),
			label
		},
		generated_at: new Date().toISOString(),
		generated_by: user.id
	};
}

// Telefunc to get detailed performance for a specific supplier
export async function onGetSupplierPerformanceDetail(
	supplierId: string,
	period: 'month' | 'quarter' | 'year' = 'month'
): Promise<SupplierPerformanceDetail> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'owner')) {
		throw new Error('Not authorized - admin/manager/owner access required');
	}

	const supabase = createSupabaseClient();

	// Get supplier info
	const { data: supplier, error: supplierError } = await supabase
		.from('suppliers')
		.select('id, name, code, email, phone, is_active')
		.eq('id', supplierId)
		.single();

	if (supplierError) throw supplierError;
	if (!supplier) throw new Error('Supplier not found');

	// Get current period performance
	const report = await onGetSupplierPerformanceReport({
		supplier_ids: [supplierId],
		period: period
	});

	const currentMetric = report.metrics.find((m) => m.supplier_id === supplierId);
	if (!currentMetric) {
		throw new Error('No performance data found for supplier');
	}

	// Get recent orders
	const { data: recentOrders, error: ordersError } = await supabase
		.from('purchase_orders')
		.select(
			'po_number, order_date, expected_delivery_date, actual_delivery_date, status, total_amount'
		)
		.eq('supplier_id', supplierId)
		.order('order_date', { ascending: false })
		.limit(10);

	if (ordersError) throw ordersError;

	const recentOrdersWithOnTime =
		recentOrders?.map((order) => ({
			po_number: order.po_number,
			order_date: order.order_date,
			expected_delivery: order.expected_delivery_date,
			actual_delivery: order.actual_delivery_date,
			status: order.status,
			total_amount: order.total_amount,
			is_on_time:
				order.expected_delivery_date && order.actual_delivery_date
					? new Date(order.actual_delivery_date) <= new Date(order.expected_delivery_date)
					: undefined
		})) || [];

	return {
		supplier_id: supplierId,
		supplier_info: {
			name: supplier.name,
			code: supplier.code,
			email: supplier.email,
			phone: supplier.phone,
			is_active: supplier.is_active
		},
		current_period: currentMetric,
		recent_orders: recentOrdersWithOnTime
	};
}

// Telefunc to export performance report data (for CSV/Excel exports)
export async function onExportSupplierPerformanceReport(
	filters?: SupplierPerformanceFilters,
	format: 'csv' | 'xlsx' = 'csv'
): Promise<{ data: any[]; filename: string }> {
	const { user } = getContext();
	if (!user || (user.role !== 'admin' && user.role !== 'manager' && user.role !== 'owner')) {
		throw new Error('Not authorized - admin/manager/owner access required');
	}

	const report = await onGetSupplierPerformanceReport(filters);

	// Transform data for export
	const exportData = report.metrics.map((metric) => ({
		'Supplier Name': metric.supplier_name,
		'Supplier Code': metric.supplier_code,
		Active: metric.is_active ? 'Yes' : 'No',
		'Total POs': metric.total_pos,
		'Completed POs': metric.completed_pos,
		'Cancelled POs': metric.cancelled_pos,
		'On-Time Deliveries': metric.on_time_deliveries,
		'Late Deliveries': metric.late_deliveries,
		'On-Time Rate (%)': metric.on_time_rate.toFixed(2),
		'Average Delivery Delay (Days)': metric.average_delivery_delay.toFixed(1),
		'Total Order Value ($)': metric.total_order_value.toFixed(2),
		'Average Order Value ($)': metric.average_order_value.toFixed(2),
		'Cost Variance Total ($)': metric.cost_variance_total.toFixed(2),
		'Average Cost Variance ($)': metric.average_cost_variance.toFixed(2),
		'Cost Variance (%)': metric.cost_variance_percentage.toFixed(2),
		'Last Order Date': metric.last_order_date
			? new Date(metric.last_order_date).toLocaleDateString()
			: 'N/A',
		'Days Since Last Order': metric.days_since_last_order || 'N/A'
	}));

	const timestamp = new Date().toISOString().split('T')[0];
	const filename = `supplier-performance-${report.period.label.replace(/\s+/g, '-')}-${timestamp}.${format}`;

	return {
		data: exportData,
		filename
	};
}
