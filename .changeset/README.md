# Changesets

A change made by a person is released as a minor version, with a changelog
entry. Add a changeset to the pull request that makes the change:

```sh
npx changeset add --minor <package> -m "What changed, for the users of the package"
```

Changesets are always `minor`: patch versions are reserved for the
automatic releases that follow new Unicode data. See the Releases section
of the [README](../README.md).
