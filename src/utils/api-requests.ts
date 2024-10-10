import { Page } from "puppeteer";

type HttpMethod = 'GET' | 'POST';

interface RequestOptions {
  method?: HttpMethod;
  headers?: Record<string, string>;
  body?: any;
}

export async function makeApiRequest<T>(page: Page, url: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', headers = {}, body } = options;

  return await page.evaluate(async (url, method, headers, body) => {
    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (body) {
      fetchOptions.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return await response.json();
    } else {
      return await response.text();
    }
  }, url, method, headers, body) as T;
}

// Keeping these for backward compatibility
export async function fetchApiData<T>(page: Page, url: string): Promise<T> {
  return makeApiRequest<T>(page, url);
}

export async function postApiDataJson<T>(page: Page, url: string, data: any): Promise<T> {
  return makeApiRequest<T>(page, url, { method: 'POST', body: data });
}

export async function postApiData<T>(page: Page, url: string): Promise<T> {
  return makeApiRequest<T>(page, url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
  });
}
