import { Fragment } from 'react';
import type { WorkflowStop } from '@/data';

/* Render a step's copy, underlining the optional emphasis word (first match)
   with the step accent. Avoids dangerouslySetInnerHTML. Shared by both
   renderers; the caller passes its own module's `em` class so the highlight
   matches that variant's stylesheet. */
export function renderCopy(stop: WorkflowStop, emClass: string) {
  const { copy, emphasis } = stop;
  if (!emphasis) return copy;
  const at = copy.indexOf(emphasis);
  if (at < 0) return copy;
  return (
    <Fragment>
      {copy.slice(0, at)}
      <em className={emClass}>{emphasis}</em>
      {copy.slice(at + emphasis.length)}
    </Fragment>
  );
}
