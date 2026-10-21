import React, { useState } from 'react';
import ForgeReconciler, {
  Button,
  Link,
  DatePicker,
  Form,
  FormFooter,
  Label,
  Select,
  Text,
  Textfield,
  useForm,
  useProductContext,
} from '@forge/react';
import { invoke, router } from '@forge/bridge';

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
  const [done, setDone] = useState(null);

  const onSubmit = async (data) => {
    setBusy(true);
    setError(null);
    try {
      const page = await invoke('createPage', {
        templateKey: data.template?.value,
        values: { title: data.title, owner: data.owner, date: data.date },
      });
      setDone(page);
      // A content action modal cannot close itself (view.close is not allowed
      // for this module), so jump to the new page instead; if navigation is
      // refused, the success message below carries the link.
      try {
        await router.navigate(page.url);
      } catch (_) {
        setBusy(false);
      }
    } catch (e) {
      setError(e.message || String(e));
      setBusy(false);
    }
  };

  if (!context) return <Text>Loading...</Text>;
  if (done) {
    return (
      <Text>
        Page created: <Link href={done.url}>{done.title}</Link>. Close this dialog to continue.
      </Text>
    );
  }

  return (
    <Form onSubmit={handleSubmit(onSubmit)}>
      <Label labelFor={getFieldId('template')}>Template</Label>
      <Select
        {...register('template', { required: true })}
        options={TEMPLATE_OPTIONS}
        placeholder="Choose a template"
      />
      <Label labelFor={getFieldId('title')}>Title</Label>
      <Textfield {...register('title', { required: true })} />
      <Label labelFor={getFieldId('owner')}>Owner</Label>
      <Textfield {...register('owner', { required: true })} />
      <Label labelFor={getFieldId('date')}>Date</Label>
      <DatePicker {...register('date', { required: true })} />
      {error && <Text>Error: {error}</Text>}
      <FormFooter>
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
