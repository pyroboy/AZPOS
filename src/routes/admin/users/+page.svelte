<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { users } from '$lib/stores/userStore';

	let { form }: { form: ActionData | undefined } = $props();

	let role = $state<keyof typeof roles>('cashier');

	const roles = {
		admin: 'Admin',
		owner: 'Owner',
		manager: 'Manager',
		pharmacist: 'Pharmacist',
		cashier: 'Cashier'
	};

	const selectedRoleLabel = $derived(roles[role]);

</script>

<div class="p-4 space-y-4">
    <h1 class="text-2xl font-bold">User Management</h1>

    <Card.Root>
        <Card.Header>
            <Card.Title>Create New User</Card.Title>
        </Card.Header>
        <Card.Content>
            <form
				method="POST"
				action="?/addUser"
				use:enhance
				class="grid sm:grid-cols-3 gap-4"
			>
                <div class="grid gap-2">
                    <Label for="name">Full Name</Label>
                    <Input id="name" name="name" required />
                </div>
                <div class="grid gap-2">
                    <Label for="username">Username</Label>
                    <Input id="username" name="username" required />
                </div>
                <div class="grid gap-2">
                    <Label for="pin">PIN</Label>
                    <Input id="pin" name="pin" type="password" required />
                </div>
				<div class="grid gap-2">
                    <Label for="role">Role</Label>
                    <Select name="role" type="single" bind:value={role}>
						<SelectTrigger class="w-full">
							{selectedRoleLabel}
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="admin">Admin</SelectItem>
							<SelectItem value="owner">Owner</SelectItem>
							<SelectItem value="manager">Manager</SelectItem>
							<SelectItem value="pharmacist">Pharmacist</SelectItem>
							<SelectItem value="cashier">Cashier</SelectItem>
						</SelectContent>
					</Select>
                </div>
                <div class="sm:col-span-3">
                    <Button type="submit">Create User</Button>
                </div>
            </form>
        </Card.Content>
    </Card.Root>

    <Card.Root>
        <Card.Header>
            <Card.Title>All Users</Card.Title>
        </Card.Header>
        <Card.Content>
            <Table.Root>
                <Table.Header>
                    <Table.Row>
                        <Table.Head>Name</Table.Head>
                        <Table.Head>Username</Table.Head>
                        <Table.Head>Role</Table.Head>
                        <Table.Head>Status</Table.Head>
                        <Table.Head class="text-right">Actions</Table.Head>
                    </Table.Row>
                </Table.Header>
                <Table.Body>
                    {#each $users as user (user.id)}
                        <Table.Row>
                            <Table.Cell>{user.full_name}</Table.Cell>
                            <Table.Cell>{user.username}</Table.Cell>
                            <Table.Cell><Badge variant="secondary">{user.role}</Badge></Table.Cell>
                            <Table.Cell>
                                <Badge variant={user.is_active ? 'default' : 'destructive'}>
                                    {user.is_active ? 'Active' : 'Inactive'}
                                </Badge>
                            </Table.Cell>
                            <Table.Cell class="text-right">
                                {#if user.is_active}
                                    <form method="POST" action="?/deactivateUser" use:enhance>
                                        <input type="hidden" name="userId" value={user.id} />
                                        <Button variant="destructive" size="sm" type="submit">Deactivate</Button>
                                    </form>
                                {/if}
                            </Table.Cell>
                        </Table.Row>
                    {/each}
                </Table.Body>
            </Table.Root>
        </Card.Content>
    </Card.Root>
</div>
