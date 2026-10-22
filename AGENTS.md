<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep the homepage's extra CTA text and URL in `src/lib/homepage.ts` so they can be edited independently of presentation.
- The authenticated AppShell owns the visible viewport height and mobile safe-area navigation; pages scroll inside main, and chat scrolls only its message list so its send form stays accessible.
- Keep publishing-location rules and mobile navigation destinations in `src/lib/app-navigation.ts` so chat and other utility screens never inherit an obstructing publishing control.
- Daily quotas are enforced by the database's `plan_limits` table; edit and execute `supabase/post-limits.sql` to change them, never substitute client-only limits or mutate quotas on page load.
