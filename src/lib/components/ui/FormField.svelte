<script lang="ts">
	interface Props {
		id: string;
		label: string;
		value?: string;
		type?: 'text' | 'email' | 'password' | 'url' | 'textarea';
		name?: string;
		placeholder?: string;
		helper?: string;
		error?: string;
		required?: boolean;
		disabled?: boolean;
		rows?: number;
	}

	let {
		id,
		label,
		value = $bindable(''),
		type = 'text',
		name,
		placeholder,
		helper,
		error,
		required = false,
		disabled = false,
		rows = 4
	}: Props = $props();
</script>

<label class="form-field" for={id}>
	<span class="form-field__label">
		{label}
		{#if required}
			<span class="form-field__required" aria-hidden="true">*</span>
		{/if}
	</span>

	{#if type === 'textarea'}
		<textarea
			class={`form-input form-textarea ${error ? 'form-input--error' : ''}`}
			{id}
			{name}
			{placeholder}
			{disabled}
			{required}
			{rows}
			bind:value
		></textarea>
	{:else}
		<input
			class={`form-input ${error ? 'form-input--error' : ''}`}
			{id}
			{name}
			{placeholder}
			{disabled}
			{required}
			type={type}
			bind:value
		/>
	{/if}

	{#if error}
		<span class="form-field__error" aria-live="assertive">{error}</span>
	{:else if helper}
		<span class="form-field__helper">{helper}</span>
	{/if}
</label>
