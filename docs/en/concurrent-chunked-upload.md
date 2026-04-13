# Concurrent Chunked Upload Design

*Last updated: April 12, 2026 at 5:16 PM PDT*

## Why this document exists

This document records the most important technical selection in BurnBox 2.0.0: the adoption of a chunked multipart upload architecture as the primary reliability mechanism for edge-hosted file ingestion.

This is the hardest part of the system because it sits at the boundary between browser behavior, network volatility, Worker execution, R2 multipart semantics, and D1 state consistency.

## Problem statement

BurnBox is not only used for small documents. Its real-world workload includes:

- installer packages
- desktop images
- binary archives
- large release artifacts

Under those conditions, direct single-request upload was too fragile. The observed failure pattern was not random:

- one upload could appear to finish while the file record did not materialize
- the next upload sometimes caused the previous file to become visible
- larger files were disproportionately unstable
- operators could not easily distinguish transfer completion from metadata finalization

Further testing made the pattern clearer:

- instability did not behave like a fixed file-size ceiling
- risk increased as part counts increased
- the same file path could appear healthy for smaller uploads and fragile for larger uploads
- mid-transfer volatility often mattered more than raw throughput
- after the current reliability changes, transfers through `4.3 GB / 870 parts` and `11 GB / 2200 parts` completed successfully

## Selected approach

BurnBox now uses the following model:

- 5 MiB chunk size
- browser-side file slicing
- Worker-mediated chunk transport
- R2 multipart assembly
- D1-backed upload plans and uploaded-part tracking

The system is described as a concurrent chunked upload design because the architecture is chunk-oriented, multipart-capable, and ready for controlled transfer concurrency, even though the current production profile uses a conservative stability-first execution order.

## Why 5 MiB

5 MiB is the practical minimum part size commonly associated with multipart object assembly, and it is also a useful operational compromise:

- small enough to reduce the cost of a failed request
- large enough to avoid exploding request counts
- well below the Worker request-body ceiling
- much safer than oversized chunk experiments

## Why not direct browser-to-R2 multipart presigned URLs

That path is theoretically possible, but it increases operational and debugging complexity:

- more client-side signing lifecycle management
- more browser-visible multipart state
- more CORS surface area
- harder failure attribution between browser, presigning, R2 visibility, and finalization

For BurnBox, the Worker-mediated path was the better tradeoff because the project values legibility and deterministic recovery over maximum raw throughput.

## Key technical meaning

This upload design changes the system in four important ways:

1. It removes the single large request as the main failure boundary.
2. It gives the server a durable upload state model instead of trusting client claims.
3. It separates transfer progress from final readiness.
4. It makes reliability a first-class system property rather than an accidental side effect.

## The central engineering lesson

The core difficulty is not "uploading a large file". The core difficulty is surviving a long sequence of dependent operations without letting one transient fault invalidate the whole transfer.

That distinction matters. A `2.35 GB` file at `5 MiB` per part requires roughly `470` part requests. A `1.2 GB` file requires roughly half as many. The larger file is not merely larger in bytes. It exposes the system to many more opportunities for:

- browser-level transport interruption
- Worker execution variance
- multipart coordination faults
- state-write pressure
- retry amplification

This is why BurnBox documents large-file upload as a cumulative reliability problem rather than a simple timeout problem.

The current implementation should therefore be read as a stable baseline, not only as an experiment. The next engineering step is resumable upload so interruption cost falls without weakening server authority over multipart truth.

## Common diagnosis errors

In systems like this, teams often make the wrong diagnosis first:

- assuming there must be a hidden hard limit at a specific file size
- assuming network instability lives only in the browser
- assuming more retries automatically means better recovery
- assuming a completed transfer body implies a ready file
- assuming edge infrastructure removes the need for explicit intermediate state

Those assumptions produce poor fixes. BurnBox treats them as documentation-level hazards because they push engineering effort toward the wrong layer.

## Hard technical problems

### 1. Transfer completion is not the same as system readiness

The browser can finish sending data before the final file is truly ready for operator use. BurnBox therefore models finalization explicitly rather than pretending that all success states are identical.

### 2. Storage identity must remain server-controlled

The client must never be allowed to invent the object identity that will later be registered as a canonical file record. Upload planning and multipart finalization therefore live on the server side.

### 3. Chunk progress must be truthful

A fake progress bar is worse than no progress bar. BurnBox now maps chunk transfer progress to real uploaded parts and reserves a distinct finalization phase for multipart assembly and metadata commit.

### 4. Edge upload reliability is a systems problem, not just a UI problem

The real challenge is the interaction between browser slicing, network retries, Worker request handling, R2 multipart semantics, and D1 coordination. Any design that ignores one of those layers will eventually produce operator-visible inconsistency.

## Hard implementation problems

### Upload state machine

The system needs an upload plan that survives across multiple requests and can represent:

- created
- uploading
- processing
- ready
- failed

### Multipart part bookkeeping

Each part requires stable numbering and durable tracking. Missing or duplicated part registration would make final assembly unreliable.

### Finalization UX

If progress reaches a high percentage and then appears motionless, users interpret that as failure. BurnBox therefore distinguishes chunk transfer from finalization in both wording and visual state.

### Recovery semantics

The system must remain correct when:

- one chunk fails
- the browser retries
- finalization fails after all chunks upload
- metadata commit succeeds or fails independently of transport completion

### Cumulative failure exposure

Every additional part adds another chance for a transient problem to surface. The system therefore has to minimize the amount of work that happens per part, keep retry ownership clear, and avoid stretching one failed part into a long opaque execution path.

## Why this matters technically

The chunked multipart design is not just an upload optimization. It is the control point that makes the rest of BurnBox credible:

- file listings become trustworthy
- share issuance can rely on a stable ready-state
- deletion semantics become easier to reason about
- the operator can understand where a transfer actually is

## Why this matters as a research artifact

BurnBox is useful as a compact example of how edge-native operator tools can evolve from optimistic prototype assumptions to stateful, failure-aware system design.

The upload path demonstrates a broader lesson:

reliability at the edge often requires explicit intermediate state, not just faster infrastructure.

It also suggests a concrete research agenda:

- resumable multipart protocols instead of whole-upload restart behavior
- lower-cost or more selective state persistence for high-part-count transfers
- operator-facing telemetry that can explain where in the transfer pipeline volatility actually occurred

For the concrete next implementation step, see the [Development Plan](development-plan.md).
