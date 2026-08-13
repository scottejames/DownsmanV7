// Shared form-field styling. Plain exported class strings rather than wrapper
// components - these are bare <input>/<select>/<textarea> elements with no
// extra behavior, so a component around them would just be indirection.

export const inputClass =
  'w-full rounded-lg border border-transparent bg-scout-field px-3 py-2 text-sm text-gray-100 placeholder:text-gray-500 transition focus:border-scout-purple-light focus:outline-none disabled:cursor-not-allowed disabled:opacity-50';

export const selectClass = inputClass;

export const textareaClass = `${inputClass} resize-none`;

export const labelClass = 'mb-1 block text-xs font-medium uppercase tracking-wide text-gray-400';

export const checkboxLabelClass = 'flex items-center gap-2 text-sm text-gray-200';

export const fieldsetLegendClass = 'mb-3 text-sm font-semibold uppercase tracking-wide text-gray-300';
