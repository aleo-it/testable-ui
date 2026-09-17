# Changesets

Add a changeset for every consumer-facing change:

```sh
pnpm changeset
```

Choose the package and release type, write the user-facing summary, and commit
the generated file. The release workflow will open a version PR on `main`; when
that PR is merged, it creates the GitHub Release and publishes changed packages.
