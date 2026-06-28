fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## Mac

### mac notarize_helpers

```sh
[bundle exec] fastlane mac notarize_helpers
```

Build + sign the universal helpers and notarize them.

Prerequisite (one-time, Account Holder only — Apple forbids creating a

Developer ID cert via API key): create a 'Developer ID Application'

certificate in Xcode > Settings > Accounts > 9CHGJ6ZAE6 > Manage

Certificates > + > Developer ID Application. Then `fastlane match import`

it into the certs repo if you want it synced across machines.

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
