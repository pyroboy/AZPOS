<!-- Agent: agent_coder | File: CheckoutForm.svelte | Last Updated: 2025-07-28T10:29:03+08:00 -->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import PaymentMethodSelector from '$lib/components/store/PaymentMethodSelector.svelte';
	import { User, CreditCard, MessageSquare } from 'lucide-svelte';
	
	// Props
	let { 
		customerInfo = $bindable({
			name: '',
			email: '',
			phone: ''
		}) as { name: string, email: string, phone: string },
		paymentMethod = $bindable('cash') as string,
		specialInstructions = $bindable('') as string,
		onSubmit = () => {},
		processing = false
	} = $props();
	
	// Form validation
	let errors = $state<Record<string, string>>({});
	
	// Validate form
	function validateForm(): boolean {
		const newErrors: Record<string, string> = {};
		
		// Customer info validation (optional but if provided, must be valid)
		if (customerInfo.email && !isValidEmail(customerInfo.email)) {
			newErrors.email = 'Please enter a valid email address';
		}
		
		if (customerInfo.phone && !isValidPhone(customerInfo.phone)) {
			newErrors.phone = 'Please enter a valid phone number';
		}
		
		if (customerInfo.name && customerInfo.name.length < 2) {
			newErrors.name = 'Name must be at least 2 characters';
		}
		
		// Special instructions length check
		if (specialInstructions.length > 500) {
			newErrors.specialInstructions = 'Special instructions must be 500 characters or less';
		}
		
		errors = newErrors;
		return Object.keys(newErrors).length === 0;
	}
	
	// Email validation
	function isValidEmail(email: string): boolean {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return emailRegex.test(email);
	}
	
	// Phone validation (basic)
	function isValidPhone(phone: string): boolean {
		const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
		return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
	}
	
	// Handle form submission
	function handleSubmit(): void {
		if (validateForm() && !processing) {
			onSubmit();
		}
	}
	
	// Real-time validation
	function handleInputChange(field: keyof typeof customerInfo, value: string): void {
		customerInfo[field] = value;
		
		// Clear error when user starts typing
		if (errors[field]) {
			const newErrors = { ...errors };
			delete newErrors[field];
			errors = newErrors;
		}
	}
</script>

<div class="space-y-6">
	<!-- Customer Information -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<User class="h-5 w-5" />
				Customer Information (Optional)
			</CardTitle>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div>
					<Label for="customer-name">Full Name</Label>
					<Input
						id="customer-name"
						type="text"
						placeholder="Enter your name"
						value={customerInfo.name}
						oninput={(e) => handleInputChange('name', (e.target as HTMLInputElement).value)}
						class={errors.name ? 'border-destructive' : ''}
					/>
					{#if errors.name}
						<p class="text-sm text-destructive mt-1">{errors.name}</p>
					{/if}
				</div>
				
				<div>
					<Label for="customer-phone">Phone Number</Label>
					<Input
						id="customer-phone"
						type="tel"
						placeholder="Enter your phone number"
						value={customerInfo.phone}
						oninput={(e) => handleInputChange('phone', (e.target as HTMLInputElement).value)}
						class={errors.phone ? 'border-destructive' : ''}
					/>
					{#if errors.phone}
						<p class="text-sm text-destructive mt-1">{errors.phone}</p>
					{/if}
				</div>
			</div>
			
			<div>
				<Label for="customer-email">Email Address</Label>
				<Input
					id="customer-email"
					type="email"
					placeholder="Enter your email address"
					value={customerInfo.email}
					oninput={(e) => handleInputChange('email', (e.target as HTMLInputElement).value)}
					class={errors.email ? 'border-destructive' : ''}
				/>
				{#if errors.email}
					<p class="text-sm text-destructive mt-1">{errors.email}</p>
				{/if}
				<p class="text-xs text-muted-foreground mt-1">
					Optional - for order updates and receipt
				</p>
			</div>
		</CardContent>
	</Card>
	
	<!-- Payment Method -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<CreditCard class="h-5 w-5" />
				Payment Method
			</CardTitle>
		</CardHeader>
		<CardContent>
			<PaymentMethodSelector bind:selectedMethod={paymentMethod} />
		</CardContent>
	</Card>
	
	<!-- Special Instructions -->
	<Card>
		<CardHeader>
			<CardTitle class="flex items-center gap-2">
				<MessageSquare class="h-5 w-5" />
				Special Instructions (Optional)
			</CardTitle>
		</CardHeader>
		<CardContent>
			<div>
				<Textarea
					placeholder="Any special requests, delivery instructions, or notes..."
					bind:value={specialInstructions}
					maxlength={500}
					rows={4}
					class={errors.specialInstructions ? 'border-destructive' : ''}
				/>
				<div class="flex justify-between items-center mt-2">
					<div>
						{#if errors.specialInstructions}
							<p class="text-sm text-destructive">{errors.specialInstructions}</p>
						{/if}
					</div>
					<p class="text-xs text-muted-foreground">
						{specialInstructions.length}/500 characters
					</p>
				</div>
			</div>
		</CardContent>
	</Card>
	
	<!-- Submit Button -->
	<div class="flex justify-end">
		<Button 
			size="lg" 
			onclick={handleSubmit}
			disabled={processing}
			class="gap-2"
		>
			{#if processing}
				<div class="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
				Processing Order...
			{:else}
				<CreditCard class="h-5 w-5" />
				Complete Order
			{/if}
		</Button>
	</div>
</div>
