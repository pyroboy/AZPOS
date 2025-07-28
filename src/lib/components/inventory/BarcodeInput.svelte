<script lang="ts">
	import { Input } from '$lib/components/ui/input';

	interface Props {
		value?: string;
		onscan?: (code: string) => void;
		[key: string]: any; // allow all other Input props
	}

	let { value = $bindable(''), onscan, ...rest }: Props = $props();

	function handleKeyDown(event: KeyboardEvent) {
		if (event.key === 'Enter' && value) {
			event.preventDefault();
			onscan?.(value);
		}
	}
</script>

<Input bind:value onkeydown={handleKeyDown} {...rest} />
