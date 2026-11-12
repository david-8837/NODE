# Firmware provenance investigation — 2026-11-12

## Conclusion

The checksum mismatch reflects two different checked-in binaries and an older manifest, not proof that either file is corrupted. The manifest was added with the older `grid_macro_1_via_rawhid.uf2`; a later commit added a different `grid_macro_1_via.uf2` without updating the manifest. **Neither binary has been independently verified against its original CI artifact in this environment. Do not flash or redistribute either as verified until its artifact and intended board are checked.** No binaries, manifest or firmware were modified in this investigation.

## Evidence

| File | SHA-256 | History |
|---|---|---|
| `firmware/grid_macro_1_via_rawhid.uf2` | `9972aed247f693ba369194eb5b981ff58b45611f8038c19550f3bfe576da2039` | Added in `f94480bcdb`, updated in [`4f6ae15b93`](https://github.com/david-8837/NODE/commit/4f6ae15b930861dc6cc8280df3dfca455433a375). The updated file hashes to the same value as the manifest. |
| `firmware/grid_macro_1_via.uf2` | `0f1a86d8039e943718da057bef4079f31d1d19448105d15a3abccbfc831bd395` | Added later in [`0f6594e99d`](https://github.com/david-8837/NODE/commit/0f6594e99dda498d8e393818c26742516f1e55eb). GitHub's file content at that commit hashes to the current value. |
| `firmware/SHA256SUMS.txt` | Contains `9972aed247f693ba369194eb5b981ff58b45611f8038c19550f3bfe576da2039  grid_macro_1_via.uf2` | Added in `4f6ae15b93` alongside the raw-HID file; its filename does not match the binary with the recorded hash. |
| `firmware/BUILD-INFO.txt` | Records the same `9972...` digest and run `43155494378` | Added in `4f6ae15b93` alongside the manifest. This is checked-in metadata, not an independently downloaded artifact. |

The GitHub API reports [run 43155494378](https://github.com/david-8837/NODE/actions/runs/43155494378) succeeded for PR head `6cd039e9b7`. Its checkout commit `19f60b8518` in the recorded build info is the corresponding GitHub-generated merge commit, not a conflicting head SHA. Its artifact `13915692529` is named `grid-macro-1-via-firmware` and GitHub reports archive SHA-256 `8f48b542c88f14bc6d7939f6f021b7e3a89463af3ff8a8cdfc3237549756c0f8`. **That is the ZIP archive hash, not the UF2 hash.** The artifact expires on 2026-11-19.

[Run 43160240812](https://github.com/david-8837/NODE/actions/runs/43160240812) also succeeded, for PR head `543abfbe63`, before the later file was committed. Its artifact is `13917955860`; GitHub reports archive hash `ef131d4b0c1e6598bbb44b03eff82283dcfb5b01fbe01d2053aa6119d3976b40`. The filename and timing make this run a plausible source of the newer UF2, but that relationship has **not** been verified. Between the two PR heads, the VIA keymap source changed layer-zero defaults to `KC_NO` and changed `process_record_user`; the two UF2s therefore must not be assumed equivalent or interchangeable. Later changes include a QMK keyboard definition version change.

The version 1.0.7 head `012fea0c3c` has a later successful [QMK run 43165673283](https://github.com/david-8837/NODE/actions/runs/43165673283), with artifact `13919453361` (archive digest `45f57ebb222b63b68241276a7703f780c89fabc016f2dfa8c346321d91cf377b`, expires 2026-11-19). It is a better candidate for checking the 1.0.7 source, but a successful CI build is not physical-device validation or proof that the checked-in UF2 matches it.

## Structural checks and limitations

Both files are 72,192 bytes and consist of 141 structurally numbered 512-byte UF2 blocks with valid UF2 magic, 256-byte payloads and RP2040 family ID `0xe48bff56`. This checks container structure only; it does **not** verify the firmware's source, function, USB protocol, electrical behavior, or safety on a specific board.

Artifact and log retrieval through `gh` was attempted for both recorded runs. GitHub's API returned metadata, but the artifact ZIPs and logs redirect to storage hosts unavailable from this sandbox, and downloads failed with EOF. Therefore their internal `SHA256SUMS.txt`, `BUILD-INFO.txt` and UF2 bytes could not be compared independently. No hardware was connected or flashed. The scripts in the repository must not be treated as independent verification: `scripts/fetch-and-verify-firmware.mjs` writes the downloaded UF2 before checking any manifest and uses machine-specific paths.

## Safe next steps on a machine with GitHub artifact access

1. Download the artifacts for runs `43155494378`, `43160240812`, and (for current 1.0.7 source) `43165673283` using `gh run download` into **separate empty directories**. Do not overwrite repository firmware.
2. In each artifact directory, check `sha256sum -c SHA256SUMS.txt`, then compare the UF2 SHA-256 to the two values above and review `BUILD-INFO.txt`, source commit, and build logs. Archive digest and UF2 digest are different values.
3. Compare the artifact source tree, QMK commit, keymap and target identity to the intended board and current release. Record the result with each filename; only then consider correcting the manifest or replacing a binary. Do not copy the older raw-HID file over the newer file merely to make the old checksum pass.
4. Verify pinout, USB identity, recovery procedure, and actual behavior on the intended physical board before release or flashing. The existing hardware checklist applies.
