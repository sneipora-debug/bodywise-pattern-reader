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

- Postural dysfunction catalog, photo/video protocol and top-5 ranking live in src/lib/mecanismo-x.ts; the AI may only return ids from that catalog (single source of truth for UI, prompt and tests).
- AI analysis runs in a requireSupabaseAuth server function (src/lib/analyze.functions.ts) that signs private-bucket photo URLs and calls the gateway from analyze.server.ts, so keys and patient photos never leave the server/user scope.
- Patient media is stored in the private "avaliacoes" bucket under <user_id>/<assessment_id>/ so storage RLS can scope by folder.
