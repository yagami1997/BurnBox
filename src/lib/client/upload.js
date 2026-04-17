/**
 * Client script: multipart upload pipeline.
 *
 * Depends on: helpers.js (apiUrl, setStatus, setUploadProgress)
 */
export function script() {
  return `
      async function queryUploadStatus(fileId) {
        try {
          const response = await fetch(apiUrl(\`/files/upload-status?fileId=\${encodeURIComponent(fileId)}\`));
          if (!response.ok) {
            return null;
          }
          return await response.json();
        } catch {
          return null;
        }
      }

      async function uploadFileInChunks(file, initData) {
        const chunkSize = Number(initData.chunkSize) || 5 * 1024 * 1024;
        const totalParts = Number(initData.totalParts) || Math.max(1, Math.ceil(file.size / chunkSize));

        // Query server for already-confirmed parts so we can resume from the right position.
        setUploadProgress(0, "Checking upload status", \`Querying server for confirmed parts...\`);
        const uploadStatus = await queryUploadStatus(initData.fileId);
        const confirmedSet = new Set(uploadStatus?.confirmedParts || []);
        const confirmedCount = confirmedSet.size;
        let uploadedBytes = confirmedCount * chunkSize;

        if (confirmedCount > 0) {
          setUploadProgress(
            file.size > 0 ? (uploadedBytes / file.size) * 95 : (confirmedCount / totalParts) * 95,
            \`Resuming from part \${confirmedCount + 1} of \${totalParts}\`,
            \`\${confirmedCount} of \${totalParts} parts already confirmed on server.\`,
          );
        } else {
          setUploadProgress(0, "Preparing multipart upload", \`0 of \${totalParts} parts uploaded.\`);
        }

        for (let partNumber = 1; partNumber <= totalParts; partNumber += 1) {
          if (confirmedSet.has(partNumber)) {
            continue;
          }
          const start = (partNumber - 1) * chunkSize;
          const end = Math.min(start + chunkSize, file.size);
          const chunk = file.slice(start, end);
          const baseProgress = file.size > 0 ? (uploadedBytes / file.size) * 95 : 0;

          setStatus(
            \`Uploading part \${partNumber}/\${totalParts}...\`,
            false,
            \`Transferring \${Math.ceil(chunk.size / 1024 / 1024)} MiB chunk through the Worker upload channel.\`,
          );
          setUploadProgress(
            baseProgress,
            \`Uploading part \${partNumber} of \${totalParts}\`,
            \`\${partNumber - 1} of \${totalParts} parts uploaded.\`,
          );

          await uploadPartWithRetry({
            fileId: initData.fileId,
            partNumber,
            totalParts,
            chunk,
            progress: baseProgress,
          });

          uploadedBytes += chunk.size;
          const uploadedParts = partNumber;
          const progress = file.size > 0 ? (uploadedBytes / file.size) * 95 : (uploadedParts / totalParts) * 95;
          setUploadProgress(
            progress,
            \`Uploading part \${uploadedParts} of \${totalParts}\`,
            \`\${uploadedParts} of \${totalParts} parts uploaded.\`,
          );
        }
      }

      async function uploadPartWithRetry(input) {
        const maxAttempts = 4;

        for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
          if (attempt > 1) {
            setStatus(
              \`Retrying part \${input.partNumber}/\${input.totalParts}...\`,
              false,
              \`Attempt \${attempt} of \${maxAttempts} after a transient upload failure.\`,
            );
            setUploadProgress(
              input.progress,
              \`Retrying part \${input.partNumber} of \${input.totalParts}\`,
              \`Recovering from a transient failure on attempt \${attempt} of \${maxAttempts}.\`,
            );
          }

          let response;
          try {
            response = await fetch(apiUrl(\`/files/\${input.fileId}/upload-part?partNumber=\${input.partNumber}\`), {
              method: "POST",
              headers: {
                "content-type": "application/octet-stream",
              },
              body: input.chunk,
            });
          } catch (error) {
            if (attempt >= maxAttempts) {
              throw new Error(\`Part \${input.partNumber} failed after \${attempt} attempts: \${String(error?.message || error)}\`);
            }
            await waitForRetry(attempt);
            continue;
          }

          const data = await response.json().catch(() => ({}));
          if (response.ok) {
            return data;
          }

          if (attempt >= maxAttempts || !isRetryablePartStatus(response.status)) {
            throw new Error(data.error || \`Failed to upload part \${input.partNumber}.\`);
          }

          await waitForRetry(attempt);
        }
      }

      function isRetryablePartStatus(status) {
        return status === 408 || status === 425 || status === 429 || status >= 500;
      }

      async function waitForRetry(attempt) {
        const delayMs = Math.min(400 * 2 ** (attempt - 1), 2500);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }

      async function abortUpload(fileId) {
        if (!fileId) {
          return;
        }

        let response;
        try {
          response = await fetch(apiUrl(\`/files/\${fileId}/abort-upload\`), { method: "POST" });
        } catch (err) {
          throw new Error(\`Abort request failed: \${String(err?.message || err)}\`);
        }
        // 404 = plan already gone; 409 = already completed — both are acceptable terminal states.
        if (!response.ok && response.status !== 404 && response.status !== 409) {
          throw new Error(\`Server returned \${response.status} when aborting upload.\`);
        }
      }
  `;
}
