import * as React from 'react';
import { useReducer, useRef } from 'react';
import {
  useNotify,
  useRecordContext,
  useResourceContext,
  useTranslate,
  useUpdate,
  Form,
  type UseUpdateOptions,
  type RaRecord,
} from 'ra-core';
import isEqual from 'lodash/isEqual';
import { Button } from '@appdotbuild/design';
import { Check, X, Loader2, Edit2 } from 'lucide-react';
import { cn } from '@appdotbuild/design';
import { TextField } from '@/components/admin/text-field';

export type InPlaceEditorAction =
  | { type: 'edit'; inputRef?: React.RefObject<HTMLInputElement> }
  | { type: 'save'; values: any }
  | { type: 'cancel' }
  | { type: 'success' }
  | { type: 'error'; error: any };

export type InPlaceEditorValue =
  | { state: 'editing' }
  | { state: 'saving'; values: any }
  | { state: 'reading' };

export interface InPlaceEditorProps<
  RecordType extends RaRecord = any,
  ErrorType = Error,
> {
  source?: string;
  mutationMode?: 'optimistic' | 'pessimistic' | 'undoable';
  mutationOptions?: UseUpdateOptions<RecordType, ErrorType>;
  cancelOnBlur?: boolean;
  notifyOnSuccess?: boolean;
  resource?: string;
  showButtons?: boolean;
  children?: React.ReactNode;
  className?: string;
  inputType?: 'number' | 'string';
}

/**
 * Renders a value, and on click it turns into an editable field.
 *
 * The editable field is rendered inside a Form component, so InPlaceEditor
 * cannot be used inside another Form component.
 */
export const InPlaceEditor = <
  RecordType extends RaRecord = any,
  ErrorType extends Error = Error,
>(
  props: InPlaceEditorProps<RecordType, ErrorType>,
) => {
  const {
    source,
    mutationMode,
    mutationOptions = {},
    className,
    cancelOnBlur,
    children = source ? <TextField source={source} /> : null,
    notifyOnSuccess,
    inputType = 'string',
  } = props;

  if (!source && !children) {
    throw new Error(
      'InPlaceEditor requires either a source prop or children prop',
    );
  }
  if (mutationMode === 'undoable' && !notifyOnSuccess) {
    throw new Error(
      'InPlaceEditor requires notifyOnSuccess to be true when mutationMode is undoable',
    );
  }

  const submitButtonRef = useRef<HTMLButtonElement>(null);

  const [state, dispatch] = useReducer(
    (
      _prevState: InPlaceEditorValue,
      action: InPlaceEditorAction,
    ): InPlaceEditorValue => {
      switch (action.type) {
        case 'edit':
          return { state: 'editing' };
        case 'save':
          return { state: 'saving', values: action.values };
        case 'error':
        case 'success':
        case 'cancel':
          return { state: 'reading' };
        default:
          throw new Error('Unhandled action');
      }
    },
    { state: 'reading' },
  );

  const record = useRecordContext();
  const resource = useResourceContext(props);
  const notify = useNotify();
  const translate = useTranslate();
  const [update] = useUpdate();

  const {
    meta: mutationMeta,
    onSuccess = () => {
      dispatch({ type: 'success' });
      if (mutationMode !== 'undoable' && !notifyOnSuccess) return;
      notify(`resources.${resource}.notifications.updated`, {
        type: 'info',
        messageArgs: {
          smart_count: 1,
          _: translate('ra.notification.updated', {
            smart_count: 1,
          }),
        },
        undoable: mutationMode === 'undoable',
      });
    },
    onError = (error: Error) => {
      notify('ra.notification.http_error', {
        type: 'error',
        messageArgs: { _: error.message },
      });
      dispatch({ type: 'error', error });
    },
    ...otherMutationOptions
  } = mutationOptions;

  const handleSave = (values: any) => {
    if (!record || !source) {
      throw new Error('No record or source found');
    }

    // Handle direct value or form values object
    let newValue =
      typeof values === 'object' && values[source] !== undefined
        ? values[source]
        : values;

    // Convert to number if inputType is number
    if (inputType === 'number' && newValue !== undefined && newValue !== '') {
      newValue = Number(newValue);
    }

    const newValues = { ...record, [source]: newValue };

    if (isEqual(newValues, record)) {
      dispatch({ type: 'cancel' });
      return;
    }
    dispatch({ type: 'save', values: newValues });
    void update(
      resource,
      {
        id: record.id,
        data: newValues,
        previousData: record,
        meta: mutationMeta,
      },
      {
        onSuccess,
        // @ts-expect-error - this is a workaround to fix the type error
        onError,
        mutationMode,
        ...otherMutationOptions,
      },
    );
  };

  const handleEdit = () => {
    dispatch({ type: 'edit' });
  };
  const handleCancel = () => {
    if (state.state === 'saving') return;
    dispatch({ type: 'cancel' });
  };
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Escape' && state.state !== 'saving') {
      dispatch({ type: 'cancel' });
    }
    if (event.key === 'Enter' && state.state !== 'saving') {
      event.preventDefault();
      const inputValue = (event.target as HTMLInputElement).value;
      handleSave({ [source!]: inputValue });
    }
  };

  const handleBlur = (event: React.FocusEvent) => {
    if (event.relatedTarget) {
      return;
    }
    if (cancelOnBlur) {
      dispatch({ type: 'cancel' });
      return;
    }
    if (state.state === 'editing') {
      // trigger the parent form submit
      // to save the changes
      (submitButtonRef.current as HTMLButtonElement).click();
    }
  };

  const renderContent = () => {
    switch (state.state) {
      case 'reading':
        return (
          <div
            onClick={handleEdit}
            className={cn(
              'flex items-center gap-1',
              // Clear box appearance but more subtle
              'px-2 py-1',
              'rounded-sm text-xs cursor-pointer',
              'in-place-editor-reading',
              className,
            )}
          >
            {children}
            <Edit2 className="h-3 w-3 ml-1" />
          </div>
        );
      case 'editing':
        if (!source) return null;
        return (
          <Form onSubmit={handleSave}>
            <div className="flex items-center gap-1 p-1">
              <input
                autoFocus
                name={source}
                type={inputType}
                defaultValue={record?.[source] || ''}
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                disabled={false}
                className={cn(
                  // Smaller, more subtle input styling
                  'h-6 w-16 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600',
                  'rounded-sm text-xs px-1.5 py-0.5',
                  // Focus state
                  'focus:border-blue-500 dark:focus:border-blue-400 focus:outline-none',
                  // Text styling
                  'text-gray-900 dark:text-white text-center',
                  // Disabled state
                  'disabled:opacity-50 disabled:cursor-not-allowed',
                  'in-place-editor-editing',
                )}
              />
              <Button
                size="sm"
                variant="ghost"
                type="button"
                onClick={(e) => {
                  const form = e.currentTarget.closest('form');
                  if (form) {
                    const formData = new FormData(form);
                    const value = formData.get(source);
                    handleSave({ [source]: value });
                  }
                }}
                ref={submitButtonRef}
                disabled={false}
                className="h-5 w-5 p-0 text-green-400 hover:text-green-300 disabled:opacity-50"
                aria-label={translate('ra.action.save')}
              >
                <Check className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={false}
                className="h-5 w-5 p-0 text-red-400 hover:text-red-300 disabled:opacity-50"
                aria-label={translate('ra.action.cancel')}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </Form>
        );
      case 'saving':
        // Show the editing interface with loading state during save
        if (!source) return null;
        return (
          <div className="flex items-center gap-1 p-1">
            <input
              name={source}
              value={state.values?.[source] || record?.[source] || ''}
              disabled={true}
              className={cn(
                // Smaller input styling with disabled state
                'h-6 w-16 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600',
                'rounded-sm text-xs px-1.5 py-0.5',
                // Text styling
                'text-gray-900 dark:text-white text-center',
                // Disabled state
                'opacity-50 cursor-not-allowed',
                'in-place-editor-saving',
              )}
              readOnly
            />
            <Button
              size="sm"
              variant="ghost"
              disabled={true}
              className="h-5 w-5 p-0 text-green-400 opacity-50"
              aria-label={translate('ra.action.save')}
            >
              <Loader2 className="h-3 w-3 animate-spin" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={true}
              className="h-5 w-5 p-0 text-red-400 opacity-50"
              aria-label={translate('ra.action.cancel')}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        );
      default:
        throw new Error('Unhandled state');
    }
  };

  return <div className={className}>{renderContent()}</div>;
};
