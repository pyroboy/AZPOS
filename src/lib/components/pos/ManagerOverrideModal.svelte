<script lang="ts">
    import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
    import { Input } from '$lib/components/ui/input';
    import { Label } from '$lib/components/ui/label';
    import { Button } from '$lib/components/ui/button';

    let { 
        show = $bindable(false),
        onConfirm,
        onCancel,
        title,
        message,
        needsReason = false
    }: {
        show?: boolean;
        onConfirm: (pin: string, reason?: string) => void;
        onCancel: () => void;
        title: string;
        message: string;
        needsReason?: boolean;
    } = $props();

    const MANAGER_PIN = '1234'; // Hardcoded for now
    let pin = $state('');
    let reason = $state('');
    let error = $state('');
    let dialog: HTMLDialogElement;

    $effect(() => {
        if (dialog && show) {
            dialog.showModal();
        } else if (dialog && !show) {
            dialog.close();
        }
    });


    function handleSubmit() {
        if (pin === MANAGER_PIN) {
            onConfirm(pin, reason);
            pin = '';
            reason = '';
            error = '';
            show = false;
        } else {
            error = 'Invalid PIN';
        }
    }

    function handleKeydown(event: KeyboardEvent) {
        if (event.key === 'Enter') {
            handleSubmit();
        }
    }
</script>

<dialog bind:this={dialog} onclose={onCancel} class="p-0 bg-transparent backdrop:bg-black/60">
    <form method="dialog" class="w-full max-w-sm">
        <Card>
            <CardHeader>
                <CardTitle id="manager-override-title">{title}</CardTitle>
                <CardDescription>{message}</CardDescription>
            </CardHeader>
            <CardContent class="grid gap-4">
                <div class="grid gap-2">
                    <Label for="pin">Manager PIN</Label>
                    <Input id="pin" type="password" bind:value={pin} onkeydown={handleKeydown} required />
                </div>
                {#if needsReason}
                    <div class="grid gap-2">
                        <Label for="reason">Reason</Label>
                        <Input id="reason" bind:value={reason} onkeydown={handleKeydown} />
                    </div>
                {/if}
                {#if error}
                    <p class="text-sm text-destructive">{error}</p>
                {/if}
            </CardContent>
            <CardFooter class="flex justify-end gap-2">
                <Button type="button" variant="outline" onclick={onCancel}>Cancel</Button>
                <Button type="button" onclick={handleSubmit}>Confirm</Button>
            </CardFooter>
        </Card>
    </form>
</dialog>
