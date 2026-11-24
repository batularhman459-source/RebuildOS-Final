import { useId, useState } from 'react';
import { Icon } from './Icon';
import { Sheet } from './Sheet';
import forms from './forms.module.css';
import styles from './Feedback.module.css';

/**
 * "Send feedback" for the beta, without a server: the message goes through the phone's
 * share sheet (Messages, WhatsApp, Mail…) to whoever invited you, or is copied.
 */
export function Feedback() {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const id = useId();

  const message = () => `RebuildOS feedback (version ${__APP_VERSION__}):\n\n${text.trim()}`;

  async function send() {
    if (!text.trim()) return;
    if (navigator.share) {
      try {
        await navigator.share({ text: message() });
        setStatus('Thanks! Sent.');
        setText('');
        return;
      } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(message());
      setStatus('Copied. Paste it in a message to the person who invited you.');
    } catch {
      setStatus('Couldn’t share or copy here. Select the text and copy it.');
    }
  }

  return (
    <section aria-labelledby="feedback-heading" className={styles.section}>
      <h2 id="feedback-heading" className={styles.heading}>
        Beta
      </h2>
      <button type="button" className={styles.row} onClick={() => setOpen(true)}>
        <Icon name="message" size={18} />
        <span>Send feedback</span>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="Send feedback">
        <h2 className={forms.title}>Send feedback</h2>
        <p className={styles.text}>What confused you, what you liked, what’s missing. Anything helps.</p>
        <label htmlFor={id} className="visually-hidden">
          Your feedback
        </label>
        <textarea id={id} className={styles.textarea} value={text} onChange={(e) => setText(e.target.value)} rows={6} placeholder="e.g. I didn’t get what the sky is at first…" />
        <button type="button" className={forms.primary} disabled={!text.trim()} onClick={() => void send()}>
          Send
        </button>
        {status && (
          <p className={styles.text} role="status">
            {status}
          </p>
        )}
      </Sheet>
    </section>
  );
}
