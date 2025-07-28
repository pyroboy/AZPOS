<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { tick } from 'svelte';

	let {
		show = $bindable(false),
		onConfirm,
		onCancel,
		title,
		message,
		needsReason = false
	}: {
		show?: boolean;
		onConfirm: () => void;
		onCancel: () => void;
		title: string;
		message: string;
		needsReason?: boolean;
	} = $props();

	const MANAGER_PIN = '1234'; // Hardcoded for now
	let pin = $state('');
	let reason = $state('');
	let error = $state('');
	let pinInputRef = $state<HTMLInputElement | undefined>(undefined);

	function handleSubmit() {
		if (pin === MANAGER_PIN) {
			onConfirm();
			resetState();
		} else {
			error = 'Invalid PIN. Please try again.';
			pin = ''; // Clear pin on failure
		}
	}

	function handleCancel() {
		resetState();
		onCancel();
	}

	function resetState() {
		pin = '';
		reason = '';
		error = '';
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter') {
			event.preventDefault();
			handleSubmit();
		}
	}

	// Reset state when the dialog is closed externally
	$effect(() => {
		if (!show) {
			resetState();
		} else {
			tick().then(() => {
				pinInputRef?.focus();
			});
		}
	});
</script>

<Dialog.Root bind:open={show} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{title}</Dialog.Title>
			<Dialog.Description>{message}</Dialog.Description>
		</Dialog.Header>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="pin">Manager PIN</Label>
				<Input
					ref={pinInputRef}
					id="pin"
					type="password"
					bind:value={pin}
					onkeydown={handleKeydown}
					autocomplete="one-time-code"
					required
				/>
			</div>
			{#if needsReason}
				<div class="grid gap-2">
					<Label for="reason">Reason (Optional)</Label>
					<Input id="reason" bind:value={reason} onkeydown={handleKeydown} />
				</div>
			{/if}
			{#if error}
				<p class="text-sm font-medium text-destructive">{error}</p>
			{/if}
		</div>
		<Dialog.Footer>
			<Button type="button" variant="outline" onclick={handleCancel}>Cancel</Button>
			<Button type="submit" onclick={handleSubmit}>Confirm</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
