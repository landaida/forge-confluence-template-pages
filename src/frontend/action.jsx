import React, { useState } from 'react';
import ForgeReconciler, {
  Button,
  DatePicker,
  Form,
  FormFooter,
  Label,
  Select,
  Text,
  TextField,
  useForm,
  useProductContext,
} from '@forge/react';
import { invoke, view } from '@forge/bridge';

const TEMPLATE_OPTIONS = [
  { label: 'Meeting notes', value: 'meeting-notes' },
  { label: 'Decision record', value: 'decision-record' },
  { label: 'Runbook', value: 'runbook' },
];

const App = () => {
  const context = useProductContext();
  const { handleSubmit, register, getFieldId } = useForm();
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async (data) => {
    setBusy(true);
    setError(null);
    try {
      await invoke('createPage', {
        templateKey: data.template?.value,
        values: { title: data.title, owner: data.owner, date: data.date },
      });
      // Close the modal and reload the host page so the new child shows up.
      await view.close({ reload: true });
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  };

  if (!context) return <Text>Loading...</Text>;

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Label labelFor={getFieldId('template')}>Template</Label>
      <Select
        {...register('template', { required: true })}
        options={TEMPLATE_OPTIONS}
        placeholder="Choose a template"
      />
      <Label labelFor={getFieldId('title')}>Title</Label>
      <TextField {...register('title', { required: true })} />
      <Label labelFor={getFieldId('owner')}>Owner</Label>
      <TextField {...register('owner', { required: true })} />
      <Label labelFor={getFieldId('date')}>Date</Label>
      <DatePicker {...register('date', { required: true })} />
      {error && <Text>Error: {error}</Text>}
      <FormFooter>
        <Button appearance="subtle" onClick={() => view.close()}>
          Cancel
        </Button>
        <Button appearance="primary" type="submit" isDisabled={busy}>
          {busy ? 'Creating...' : 'Create page'}
        </Button>
      </FormFooter>
    </Form>
  );
};

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
