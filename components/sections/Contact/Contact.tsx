'use client';

import { useRef, useState, useEffect, FormEvent, ReactNode } from 'react';
import { useGSAP } from '@gsap/react';
import { gsap } from '@/lib/gsap';
import { useReducedMotion } from '@/lib/useReducedMotion';
import { content } from '@/data';
import styles from './Contact.module.css';

const c = content.contact;

// Scrub-timeline pacing (in timeline units; each row consumes 1 unit).
// Inside a row:
//   chars   : 0.00 → 0.65        typewriter stagger
//   inputs  : 0.25 → 0.65        input wrap fade-up
//   borders : 0.30 → 0.80        underline width 0% → 100%
//   chips   : 0.55 → 0.95        chip group fade-up
//   gap     : 0.95 → 1.00        small breather before next row
const TIMING = {
  CHAR_DURATION: 0.65,
  CHAR_STAGGER: 0.018,
  INPUT_DURATION: 0.4,
  INPUT_STAGGER: 0.08,
  INPUT_OFFSET: 0.25,
  BORDER_DURATION: 0.5,
  BORDER_STAGGER: 0.1,
  BORDER_OFFSET: 0.3,
  CHIP_DURATION: 0.4,
  CHIP_STAGGER: 0.08,
  CHIP_OFFSET: 0.55,
  SUBMIT_DURATION: 0.5,
} as const;

// Render a static string as one <span> per character so each glyph can be
// tweened independently. Whitespace is rendered as a non-breaking space so it
// doesn't collapse when each char is `display: inline-block` and the parent
// switches to `white-space: normal` at mobile breakpoints.
//
// NOTE (F-IN-01): key={i} (index) is used intentionally. The input is always
// a static string from the JSON import (see SPLITS at module scope) — the
// character list never reorders or partially updates, so index keys are safe.
function splitChars(text: string): ReactNode {
  return Array.from(text).map((ch, i) => (
    <span key={i} className={styles.char}>
      {ch === ' ' ? ' ' : ch}
    </span>
  ));
}

// Content is a static JSON import — splits never change, so build them once
// at module scope instead of memoizing per render.
const SPLITS = {
  row1Lead: splitChars(`${c.row1.greeting} ${c.row1.recipient}${c.row1.afterName} `),
  row1Between: splitChars(` ${c.row1.between} `),
  row2Lead: splitChars(`${c.row2.lead} `),
  row3Lead: splitChars(`${c.row3.lead} `),
  row4Lead: splitChars(`${c.row4.lead} `),
};

const SUBMIT_CHARS = Array.from(c.submit);

export function Contact() {
  const sectionRef = useRef<HTMLElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const reducedMotion = useReducedMotion();

  const [name, setName] = useState('');
  const [country, setCountry] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [topic, setTopic] = useState<string | null>(null);
  const [channel, setChannel] = useState<string | null>(c.row3.defaultSelected);
  const [emailError, setEmailError] = useState(false);
  const [mailtoLengthError, setMailtoLengthError] = useState(false);

  // Maximum mailto: URL length before most OS / mail-client combinations
  // silently fail (empirically ~2 000 chars; 1 800 gives comfortable headroom).
  const MAILTO_MAX_LENGTH = 1800;

  useGSAP(() => {
    if (!sectionRef.current || !panelRef.current || !formRef.current) return;

    const form = formRef.current;
    const panel = panelRef.current;

    const chars = form.querySelectorAll<HTMLElement>(`.${styles.char}`);
    const revealItems = form.querySelectorAll<HTMLElement>(`.${styles.revealItem}`);
    const inputBorders = form.querySelectorAll<HTMLElement>(`.${styles.inputBorder}`);
    const submit = form.querySelector<HTMLElement>(`.${styles.submit}`);

    // SSR ships visible content; JS hides immediately on mount before the
    // first animation frame, then animates in. This avoids a flash of
    // invisible content for non-reduced-motion users between hydration and
    // the first GSAP tick.
    gsap.set(chars, { opacity: 0 });
    gsap.set(revealItems, { opacity: 0, y: 14 });
    gsap.set(inputBorders, { width: 0 });
    if (submit) gsap.set(submit, { opacity: 0, y: 20 });

    if (reducedMotion) {
      // No scroll animation — just reveal everything.
      gsap.set(chars, { opacity: 1 });
      gsap.set(revealItems, { opacity: 1, y: 0 });
      gsap.set(inputBorders, { width: '100%' });
      if (submit) gsap.set(submit, { opacity: 1, y: 0 });
      return;
    }

    // Scrub-driven master timeline. Trigger and pin target are the same
    // element (the panel) so the trigger origin and pin spacer agree on
    // every ScrollTrigger.refresh() — otherwise font-load or Lenis resize
    // can drift the pin start.
    const tl = gsap.timeline({
      scrollTrigger: {
        trigger: panel,
        // Last section. The scrubbed reveal is spread across this whole pin
        // distance, and pinSpacing adds it to the document, so an over-long pin
        // means the page keeps scrolling on a fully-revealed panel before it
        // ends. 150% (≈1.5 screens) reveals all four rows + submit at a brisk,
        // legible pace and lets the page bottom out right as the form completes.
        // Tunable — raise for a slower reveal, lower for a tighter ending.
        end: '+=150%',
        pin: panel,
        pinSpacing: true,
        scrub: 1,
        invalidateOnRefresh: true,
        anticipatePin: 1,
      },
      defaults: { ease: 'none' },
    });

    const rows = form.querySelectorAll<HTMLElement>(`.${styles.row}`);
    rows.forEach((row, rowIdx) => {
      const start = rowIdx;
      const rowChars = row.querySelectorAll<HTMLElement>(`.${styles.char}`);
      const rowBorders = row.querySelectorAll<HTMLElement>(`.${styles.inputBorder}`);
      const rowInputs = row.querySelectorAll<HTMLElement>(`.${styles.inputWrap}`);
      const rowChips = row.querySelectorAll<HTMLElement>(`.${styles.chip}`);

      if (rowChars.length) {
        tl.to(
          rowChars,
          {
            opacity: 1,
            duration: TIMING.CHAR_DURATION,
            stagger: { each: TIMING.CHAR_STAGGER, from: 'start' },
          },
          start
        );
      }

      if (rowInputs.length) {
        tl.to(
          rowInputs,
          { opacity: 1, y: 0, duration: TIMING.INPUT_DURATION, stagger: TIMING.INPUT_STAGGER },
          start + TIMING.INPUT_OFFSET
        );
      }

      if (rowBorders.length) {
        tl.to(
          rowBorders,
          { width: '100%', duration: TIMING.BORDER_DURATION, stagger: TIMING.BORDER_STAGGER },
          start + TIMING.BORDER_OFFSET
        );
      }

      if (rowChips.length) {
        tl.to(
          rowChips,
          { opacity: 1, y: 0, duration: TIMING.CHIP_DURATION, stagger: TIMING.CHIP_STAGGER },
          start + TIMING.CHIP_OFFSET
        );
      }
    });

    if (submit) {
      tl.to(submit, { opacity: 1, y: 0, duration: TIMING.SUBMIT_DURATION }, rows.length);
    }

    // No explicit cleanup — useGSAP's scope handles timeline.kill() (which
    // internally kills attached ScrollTriggers) and reverts pin layout on
    // unmount/Fast Refresh.
  }, { scope: sectionRef, dependencies: [reducedMotion] });

  function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmedEmail = email.trim();

    // Use the browser's native email validator (type="email" input validity)
    // rather than a hand-rolled regex — it handles edge cases that simple
    // /^\S+@\S+\.\S+$/ patterns miss (missing TLD, IP literals, etc.).
    const inputEl = formRef.current?.querySelector<HTMLInputElement>('input[name="email"]');
    const emailOk = inputEl ? inputEl.validity.valid && trimmedEmail.length > 0 : trimmedEmail.includes('@');
    if (!emailOk) {
      setEmailError(true);
      return;
    }
    setEmailError(false);
    setMailtoLengthError(false);

    const trimmedName = name.trim();
    const trimmedCountry = country.trim();
    const trimmedMessage = message.trim();

    // Use the same fallback in both subject and body so they're consistent.
    const resolvedTopic = topic ?? 'New message';

    const subject = encodeURIComponent(`${resolvedTopic} — ${trimmedName || 'A friend'}`);
    // CRLF is required by RFC 6068; Outlook collapses LF-only into one paragraph.
    const body = encodeURIComponent(
      [
        `Hi ${c.row1.recipient},`,
        '',
        `I'm ${trimmedName || '—'}, reaching out from ${trimmedCountry || '—'}.`,
        `Topic: ${resolvedTopic}.`,
        `Best channel: ${channel ?? '—'} (${trimmedEmail || '—'}).`,
        '',
        trimmedMessage || '—',
      ].join('\r\n')
    );

    const href = `mailto:${c.fallback.email}?subject=${subject}&body=${body}`;

    // Guard against OS / mail-client URL length limits. A URL that silently
    // exceeds the limit produces no error and no email — surface it instead.
    if (href.length > MAILTO_MAX_LENGTH) {
      setMailtoLengthError(true);
      return;
    }

    window.location.href = href;
  }

  return (
    <section
      ref={sectionRef}
      className={styles.section}
      id="contact"
      aria-labelledby="contact-heading"
    >
      <h2 id="contact-heading" className={styles.srOnly}>Contact</h2>

      <div ref={panelRef} className={styles.panel}>
        <form ref={formRef} className={styles.form} onSubmit={handleSubmit} noValidate>
          {/* Row 1 — greeting + name + country */}
          <div className={styles.row}>
            <span className={styles.text}>{SPLITS.row1Lead}</span>
            <RevealInput
              value={name}
              onChange={setName}
              placeholder={c.row1.nameLabel}
              name="name"
            />
            <span className={styles.text}>{SPLITS.row1Between}</span>
            <RevealInput
              value={country}
              onChange={setCountry}
              placeholder={c.row1.countryLabel}
              name="country"
            />
          </div>

          {/* Row 2 — topic chips */}
          <div className={styles.row}>
            <span className={styles.text}>{SPLITS.row2Lead}</span>
            <div className={styles.chipGroup} role="group" aria-label="Topic">
              {c.row2.options.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={topic === opt}
                  onSelect={() => setTopic(topic === opt ? null : opt)}
                />
              ))}
            </div>
          </div>

          {/* Row 3 — email + channel chips */}
          <div className={styles.row}>
            <span className={styles.text}>{SPLITS.row3Lead}</span>
            <RevealInput
              value={email}
              onChange={(v) => { setEmail(v); if (emailError) setEmailError(false); }}
              placeholder={channel === 'WhatsApp' ? c.row3.phoneLabel : c.row3.emailLabel}
              name="email"
              type={channel === 'WhatsApp' ? 'tel' : 'email'}
              error={emailError}
              grow
            />
            <div className={styles.chipGroup} role="group" aria-label="Channel">
              {c.row3.options.map((opt) => (
                <Chip
                  key={opt}
                  label={opt}
                  selected={channel === opt}
                  onSelect={() => setChannel(channel === opt ? null : opt)}
                />
              ))}
            </div>
          </div>

          {/* Row 4 — message */}
          <div className={styles.row}>
            <span className={styles.text}>{SPLITS.row4Lead}</span>
            <RevealInput
              value={message}
              onChange={setMessage}
              placeholder={c.row4.label}
              name="message"
              grow
            />
          </div>

          {/* NOTE (F-IN-01): key={i} on SUBMIT_CHARS is intentional — the array
              is built once from the static c.submit string and never mutates. */}
          <button type="submit" className={styles.submit}>
            <span className={styles.submitTextWrap}>
              <span className={styles.submitTextBase}>
                {SUBMIT_CHARS.map((char, i) => (
                  <span
                    key={i}
                    className={styles.submitChar}
                    style={{ transitionDelay: `${i * 0.025}s` }}
                  >
                    {char === ' ' ? ' ' : char}
                  </span>
                ))}
              </span>
              <span className={styles.submitTextClone} aria-hidden="true">
                {SUBMIT_CHARS.map((char, i) => (
                  <span
                    key={i}
                    className={styles.submitChar}
                    style={{ transitionDelay: `${i * 0.025}s` }}
                  >
                    {char === ' ' ? ' ' : char}
                  </span>
                ))}
              </span>
            </span>
            <span className={styles.submitArrow} aria-hidden="true">
              {/* Diagonal ↗ with two perpendicular caps — geometry matches
                  the inspiration's arrow, color uses our accent token. */}
              <svg viewBox="0 0 19 19" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M1.25 17.75L17.75 1.25M17.75 1.25L17.75 17.75M17.75 1.25L1.25 1.25"
                  stroke="currentColor"
                  strokeWidth="2.5"
                />
              </svg>
            </span>
          </button>

          {/* Length-cap error: surfaced when the assembled mailto: URL would
              silently exceed OS / mail-client limits (~1 800 chars). Ask the
              user to shorten their message before retrying. */}
          {mailtoLengthError && (
            <p className={styles.fallback} role="alert" aria-live="polite">
              Your message is too long for the email link. Please shorten it and try again, or email directly:{' '}
              <a className={styles.fallbackLink} href={`mailto:${c.fallback.email}`}>
                {c.fallback.email}
              </a>
            </p>
          )}

          {/* Fallback for users without a configured mail handler. */}
          <p className={styles.fallback}>
            {c.fallback.label}{' '}
            <a className={styles.fallbackLink} href={`mailto:${c.fallback.email}`}>
              {c.fallback.email}
            </a>
          </p>
        </form>
      </div>
    </section>
  );
}

interface RevealInputProps {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  /** Optional override; defaults to `placeholder`. */
  ariaLabel?: string;
  name: string;
  type?: string;
  grow?: boolean;
  error?: boolean;
}

const INPUT_WIDTH_BUFFER_MIN = 12;
const INPUT_WIDTH_BUFFER_RATIO = 0.3;

function RevealInput({
  value,
  onChange,
  placeholder,
  ariaLabel = placeholder,
  name,
  type = 'text',
  grow = false,
  error = false,
}: RevealInputProps) {
  const mirrorRef = useRef<HTMLSpanElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (grow || !mirrorRef.current) return;

    const measure = () => {
      const el = mirrorRef.current;
      if (!el) return;
      const measured = Math.ceil(el.getBoundingClientRect().width);
      const fontPx = parseFloat(getComputedStyle(el).fontSize);
      const buffer = Math.max(
        INPUT_WIDTH_BUFFER_MIN,
        Math.round(fontPx * INPUT_WIDTH_BUFFER_RATIO)
      );
      setWidth(measured + buffer);
    };

    measure();

    // Re-measure after the custom font loads — initial paint uses fallback.
    if (typeof document !== 'undefined' && document.fonts?.ready) {
      let cancelled = false;
      document.fonts.ready
        .then(() => { if (!cancelled) measure(); })
        .catch(() => { /* fonts.ready shouldn't reject; ignore quirks. */ });
      return () => { cancelled = true; };
    }
  }, [value, placeholder, grow]);

  return (
    <span
      className={`${styles.inputWrap} ${styles.revealItem} ${grow ? styles.inputWrapGrow : ''} ${error ? styles.inputWrapError : ''}`}
    >
      <span ref={mirrorRef} className={styles.inputMirror} aria-hidden="true">
        {value || placeholder}
      </span>
      <input
        className={styles.input}
        type={type}
        name={name}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={error || undefined}
        autoComplete="off"
        style={!grow && width ? { width: `${width}px` } : undefined}
      />
      {/* Animated underline — width drives 0% → 100% during scroll reveal. */}
      <span className={styles.inputBorder} aria-hidden="true" />
    </span>
  );
}

interface ChipProps {
  label: string;
  selected: boolean;
  onSelect: () => void;
}

function Chip({ label, selected, onSelect }: ChipProps) {
  // Two stacked layers (base + clone), each split into per-character spans.
  // Base rests; clone sits at translateY(100%). On hover the base slides up
  // off-canvas and the clone slides into place, with a per-char transition
  // delay creating a left-to-right cascade. The clone is aria-hidden so it
  // doesn't duplicate the accessible name; visible base spans concatenate
  // into the button name automatically.
  //
  // NOTE (F-IN-01): key={i} on chars is intentional — chip labels come from
  // the static JSON import (c.row2.options / c.row3.options) and never reorder.
  const chars = Array.from(label);
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onSelect}
      className={`${styles.chip} ${styles.revealItem} ${selected ? styles.chipSelected : ''}`}
    >
      <span className={styles.chipTextWrap}>
        <span className={styles.chipTextBase}>
          {chars.map((ch, i) => (
            <span
              key={i}
              className={styles.chipChar}
              style={{ transitionDelay: `${i * 0.02}s` }}
            >
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </span>
        <span className={styles.chipTextClone} aria-hidden="true">
          {chars.map((ch, i) => (
            <span
              key={i}
              className={styles.chipChar}
              style={{ transitionDelay: `${i * 0.02}s` }}
            >
              {ch === ' ' ? ' ' : ch}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}
