import { settingsStore } from '$lib/stores/settingsStore';
import { settingsSchema } from '$lib/schemas/models';
import { fail } from '@sveltejs/kit';
import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    const userRole = locals.user?.role;

    const settings = settingsStore.get();
    const form = await superValidate(settings, zod(settingsSchema));

    return { 
        form,
        userRole
    };
};

export const actions: Actions = {
	update: async ({ request, locals }) => {
        if (locals.user?.role !== 'admin') {
            return fail(403, { message: 'You do not have permission to perform this action.' });
        }

		const form = await superValidate(request, zod(settingsSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		settingsStore.set(form.data);

		return { form };
	}
};