export const API_BASE_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "";

let authToken = null;
let tokenExpiry = 0;

export async function getToken() {
  try {
    const currentTime = Math.floor(Date.now() / 1000);
    if (authToken && tokenExpiry > currentTime + 2) {
      return authToken;
    }

    let retries = 3;
    let lastError = null;

    while (retries > 0) {
      try {
        const tokenUrl = "/api/auth/token";

        const response = await fetch(tokenUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const responseText = await response.text();
          throw new Error(`Failed to get token: ${response.status}`);
        }

        const data = await response.json();

        if (!data.token) {
          throw new Error("Token missing from response");
        }

        authToken = data.token;
        tokenExpiry = Math.floor(Date.now() / 1000) + (data.expires_in || 10);

        return authToken;
      } catch (error) {
        lastError = error;
        retries--;

        if (retries > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, 1000 * (3 - retries)),
          );
        }
      }
    }

    throw lastError || new Error("Failed to get token after multiple attempts");
  } catch (error) {
    throw error;
  }
}

export async function fetchWithAuth(endpoint, options = {}) {
  try {
    const token = await getToken();
    if (!endpoint.startsWith("http") && !API_BASE_URL) {
      throw new Error("Backend URL not configured");
    }
    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE_URL}${endpoint}`;

    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };

    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      authToken = null;
      const newToken = await getToken();

      const refreshHeaders = {
        ...options.headers,
        Authorization: `Bearer ${newToken}`,
      };

      if (!(options.body instanceof FormData)) {
        refreshHeaders["Content-Type"] =
          refreshHeaders["Content-Type"] || "application/json";
      }

      return fetch(url, {
        ...options,
        headers: refreshHeaders,
      });
    }

    return response;
  } catch (error) {
    throw error;
  }
}

export async function getUploadUrl(fileName, fileType) {
  const response = await fetchWithAuth("/generate-upload-url", {
    method: "POST",
    body: JSON.stringify({
      file_name: fileName,
      file_type: fileType,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get upload URL: ${response.status}`);
  }

  const data = await response.json();

  return {
    ...data,
    timestamp: Date.now(),
  };
}

async function uploadToSignedUrl(signedUrlData, file) {
  const now = Date.now();
  if (now - signedUrlData.timestamp > 8000) {
    throw new Error("Upload URL has expired, please try again");
  }

  const uploadResponse = await fetch(signedUrlData.signed_url, {
    method: "PUT",
    headers: {
      "Content-Type": file.type,
    },
    body: file,
  });

  if (!uploadResponse.ok) {
    throw new Error("Failed to upload file");
  }

  return uploadResponse;
}

const handleSubmit = async (file) => {
  if (isAnalyzing) {
    return;
  }

  setIsAnalyzing(true);
  setError(null);
  fileRef.current = file;

  try {
    const subscriptionPromise = checkSubscription();

    const signedUrlData = await getUploadUrl(file.name, file.type);

    await uploadToSignedUrl(signedUrlData, file);

    const { hasSubscription } = await subscriptionPromise;

    const [reportResult, transcription_data] = await Promise.all([
      createReport(signedUrlData.bucket, signedUrlData.file_name),
      transcribeAudio(file, hasSubscription),
    ]);

    setTranscriptionData(transcription_data);

    startPolling(reportResult.task_id);
  } catch (error) {
    console.error("Submission error:", error);
    setError(error.message || "Failed to submit file");
    setIsAnalyzing(false);
  }
};

export async function createReport(bucketName, fileName) {
  const response = await fetchWithAuth("/report", {
    method: "POST",
    body: JSON.stringify({
      bucket_name: bucketName,
      file_name: fileName,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create report: ${response.status}`);
  }

  return response.json();
}

export async function getReportStatus(taskId, hasSubscription = false) {
  const response = await fetchWithAuth(
    `/report-status/${taskId}?has_subscription=${hasSubscription}`,
  );

  if (!response.ok) {
    throw new Error(`Failed to get report status: ${response.status}`);
  }

  return response.json();
}

export async function transcribeAudio(file, hasSubscription = false) {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetchWithAuth(
    `/transcribe?has_subscription=${Boolean(hasSubscription)}`,
    {
      method: "POST",
      body: formData,
    },
  );

  if (!response.ok) {
    throw new Error(`Failed to transcribe audio: ${response.status}`);
  }

  return response.json();
}

export async function checkSubscription() {
  try {
    const response = await fetch("/api/check-subscription");
    return await response.json();
  } catch (error) {
    console.error("Error checking subscription:", error);
    return { hasSubscription: false };
  }
}

export async function sendChatMessage(
  message,
  context,
  hasSubscription = false,
  taskId = null,
) {
  const url = `/chat?has_subscription=${hasSubscription}${taskId ? `&task_id=${taskId}` : ""}`;
  const response = await fetchWithAuth(url, {
    method: "POST",
    body: JSON.stringify({
      message,
      context,
    }),
  });

  if (!response.ok) {
    throw new Error(`Chat request failed: ${response.status}`);
  }

  return response.json();
}

export async function getChatUsage(taskId) {
  if (!taskId) {
    return { message_count: 0, limit: 10, remaining: 10 };
  }

  const response = await fetchWithAuth(`/chat-usage/${taskId}`);

  if (!response.ok) {
    throw new Error(`Failed to get chat usage: ${response.status}`);
  }

  return response.json();
}
