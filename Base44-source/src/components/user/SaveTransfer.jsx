import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { cloudEnabled } from '@/api/cloudSave';
import { exportPlayerSave, importPlayerSave } from '@/api/localBase44';

export default function SaveTransfer({ onImported }) {
  const [file, setFile] = useState(null);
  const [savedText, setSavedText] = useState('');
  const [exportedText, setExportedText] = useState('');
  const [overwrite, setOverwrite] = useState(false);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState('');

  async function transfer(operation) {
    setWorking(true);
    setMessage('');
    try {
      await operation();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setWorking(false);
    }
  }

  function download() {
    return transfer(async () => {
      const save = await exportPlayerSave();
      const url = URL.createObjectURL(new Blob([JSON.stringify(save, null, 2)], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url;
      link.download = 'eldritch-horrors-save.json';
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage('Save exported.');
    });
  }

  function upload(event) {
    event.preventDefault();
    if ((!file && !savedText.trim()) || (file && file.size > 295_000) || new Blob([savedText]).size > 295_000) {
      setMessage('Choose a save file or paste save JSON under 295 KB.');
      return;
    }
    const form = event.currentTarget;
    return transfer(async () => {
      await importPlayerSave(JSON.parse(savedText.trim() || await file.text()), overwrite);
      await onImported();
      setSavedText('');
      setFile(null);
      form.reset();
      setMessage('Save imported into Turso.');
    });
  }

  return <section className="mt-6 space-y-3 border-t pt-5">
    <h2 className="text-xl font-semibold">Game save</h2>
    <p className="text-sm text-muted-foreground">
      {cloudEnabled ? 'Progress saves to Turso. This browser keeps the key to your save.' : 'Progress saves in this browser. Export it to move to the deployed game.'}
    </p>
    <div className="flex flex-wrap gap-2">
      <Button type="button" onClick={download} disabled={working}>Export save</Button>
      <Button type="button" disabled={working} onClick={() => transfer(async () => {
        await navigator.clipboard.writeText(JSON.stringify(await exportPlayerSave()));
        setMessage('Save copied to clipboard.');
      })}>Copy save</Button>
    </div>
    <Button type="button" variant="outline" disabled={working} onClick={() => transfer(async () => {
      setExportedText(JSON.stringify(await exportPlayerSave()));
    })}>Show save JSON</Button>
    {exportedText && <label className="block">Exported save JSON
      <textarea className="block w-full border rounded bg-background" readOnly value={exportedText}
        onFocus={event => event.currentTarget.select()} rows={3} />
    </label>}
    {cloudEnabled && <form onSubmit={upload} className="space-y-3">
      <label className="block">Select a save file
        <input className="block" type="file" accept=".json,application/json"
          onChange={event => setFile(event.target.files?.[0] ?? null)} />
      </label>
      <label className="block">Or paste save JSON
        <textarea className="block w-full border rounded bg-background" value={savedText}
          onChange={event => setSavedText(event.target.value)} rows={3} />
      </label>
      <label className="block">
        <input type="checkbox" checked={overwrite} onChange={event => setOverwrite(event.target.checked)} />
        {' Replace existing save'}
      </label>
      <Button type="submit" disabled={working || (!file && !savedText.trim())}>Import save</Button>
    </form>}
    <p role="status">{message}</p>
  </section>;
}
