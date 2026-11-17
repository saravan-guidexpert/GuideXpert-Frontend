import { getApiBaseUrl } from './apiBaseUrl';

async function resultRequest(path, options = {}) {
  const headers = { ...options.headers };
  if (options.body) headers['Content-Type'] = 'application/json';
  let response;
  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      method: options.method || 'GET',
      headers,
      body: options.body,
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    return {
      ok: false,
      status: 0,
      data: { message: 'Unable to reach GuideXpert. Check your connection and try again.' },
    };
  }

  const text = await response.text();
  let data = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: 'Invalid response from server' };
    }
  }
  return { ok: response.ok, status: response.status, data };
}

export function requestResultOtp(mobile) {
  return resultRequest('/jee-main-mock-test/results/request-otp', {
    method: 'POST',
    body: JSON.stringify({ mobile }),
  });
}

export function getResultOtpStatus() {
  return resultRequest('/jee-main-mock-test/results/pending');
}

export function resendResultOtp() {
  return resultRequest('/jee-main-mock-test/results/resend-otp', { method: 'POST' });
}

export function cancelResultOtp() {
  return resultRequest('/jee-main-mock-test/results/cancel', { method: 'POST' });
}

export function verifyResultOtp(otp) {
  return resultRequest('/jee-main-mock-test/results/verify-otp', {
    method: 'POST',
    body: JSON.stringify({ otp }),
  });
}

export function getMockTestResult() {
  return resultRequest('/jee-main-mock-test/results/me');
}

export function logoutMockTestResult() {
  return resultRequest('/jee-main-mock-test/results/logout', { method: 'POST' });
}

export async function downloadMockTestResultPdf() {
  let response;
  try {
    response = await fetch(`${getApiBaseUrl()}/jee-main-mock-test/results/pdf`, {
      method: 'GET',
      credentials: 'include',
      cache: 'no-store',
    });
  } catch {
    return { ok: false, message: 'Unable to reach GuideXpert. Check your connection and try again.' };
  }
  if (!response.ok) {
    let data = {};
    try {
      data = await response.json();
    } catch {
      data = {};
    }
    return {
      ok: false,
      status: response.status,
      code: data.code,
      message: data.message || 'The result PDF is not available.',
    };
  }
  return { ok: true, blob: await response.blob() };
}
