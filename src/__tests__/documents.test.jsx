import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { http, HttpResponse } from 'msw';
import { AuthProvider } from '../context/AuthContext';
import { DocumentsPanel } from '../components/documents/DocumentsPanel';
import { server } from '../test/server';
import { API_BASE, adminUser, buyerUser } from '../test/fixtures';

// Order documents vault (v0.8 F1 — FEAT-08). All titles, versions and
// dates below are API-returned fixture values asserted verbatim —
// nothing is computed in these tests.
const order = {
  _id: 'order-1',
  orderNumber: 'HAO-2026-100001',
  status: 'Confirmed',
  createdAt: '2026-11-20T10:30:00.000Z',
  items: [],
  timeline: [],
};

let documentsList;
let requests;

const renderPanel = (panelOrder = order, props = {}) => {
  localStorage.setItem('hao_token', 'test-token');
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>
          <DocumentsPanel order={panelOrder} {...props} />
        </AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

beforeEach(() => {
  requests = [];
  documentsList = [
    {
      _id: 'doc-1',
      type: 'packing_list',
      title: 'Packing List — Order HAO-2026-100001',
      version: 2,
      generatedFrom: 'order',
      createdAt: '2026-11-24T09:00:00.000Z',
    },
    {
      id: 'doc-2',
      type: 'export_commercial_invoice',
      title: 'Export Commercial Invoice — Nov shipment',
      version: 1,
      generatedFrom: 'template',
      createdAt: '2026-11-24T10:00:00.000Z',
    },
    {
      _id: 'doc-3',
      type: 'custom',
      title: 'Insurance Certificate',
      generatedFrom: 'upload',
      createdAt: '2026-11-25T08:30:00.000Z',
    },
  ];
  server.use(
    http.get(`${API_BASE}/orders/:orderId/documents`, () =>
      HttpResponse.json({ success: true, data: documentsList })
    )
  );
});

describe('DocumentsPanel — list', () => {
  it('renders grouped documents with version badges and Generated/Uploaded labels', async () => {
    renderPanel();

    // Group headings (human labels for the system types; uploads under
    // "Custom documents").
    expect(await screen.findByText('Packing List')).toBeInTheDocument();
    expect(screen.getByText('Export Commercial Invoice')).toBeInTheDocument();
    expect(screen.getByText('Custom documents')).toBeInTheDocument();

    // API-returned titles verbatim.
    expect(screen.getByText('Packing List — Order HAO-2026-100001')).toBeInTheDocument();
    expect(screen.getByText('Export Commercial Invoice — Nov shipment')).toBeInTheDocument();
    expect(screen.getByText('Insurance Certificate')).toBeInTheDocument();

    // Version badges only where the API provides a version.
    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('v1')).toBeInTheDocument();

    // generatedFrom: 'order'/'template' -> Generated, 'upload' -> Uploaded.
    expect(screen.getAllByText('Generated')).toHaveLength(2);
    expect(screen.getByText('Uploaded')).toBeInTheDocument();

    // Created date rendered from the API field.
    expect(screen.getAllByText(/Nov 24, 2026/)).toHaveLength(2);
    expect(screen.getByText(/Nov 25, 2026/)).toBeInTheDocument();
  });

  it('accepts a bare-array list response', async () => {
    server.use(
      http.get(`${API_BASE}/orders/:orderId/documents`, () =>
        HttpResponse.json(documentsList)
      )
    );
    renderPanel();
    expect(await screen.findByText('Insurance Certificate')).toBeInTheDocument();
  });

  it('shows the vault explanation when there are no documents', async () => {
    documentsList = [];
    renderPanel();
    expect(await screen.findByText(/This vault holds the order's export documents/)).toBeInTheDocument();
  });
});

describe('DocumentsPanel — generate', () => {
  beforeEach(() => {
    server.use(
      http.post(`${API_BASE}/orders/:orderId/documents/generate`, async ({ request }) => {
        const body = await request.json();
        requests.push(body);
        documentsList = [
          ...documentsList,
          {
            _id: 'doc-generated-1',
            type: body.type,
            title: 'Fresh Packing List',
            version: 3,
            generatedFrom: 'order',
            createdAt: '2026-11-25T12:00:00.000Z',
          },
        ];
        return HttpResponse.json({ success: true });
      })
    );
  });

  it('POSTs { type: packing_list } and the list refreshes', async () => {
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: /^generate$/i }));
    await user.click(screen.getByRole('button', { name: /generate packing list/i }));

    await waitFor(() => expect(requests).toContainEqual({ type: 'packing_list' }));
    expect(await screen.findByText('Fresh Packing List')).toBeInTheDocument();
    expect(screen.getByText('v3')).toBeInTheDocument();
  });
});

describe('DocumentsPanel — buyer generate refused', () => {
  it('hides the generate menu without an alarming error on a 403', async () => {
    server.use(
      http.post(`${API_BASE}/orders/:orderId/documents/generate`, () =>
        HttpResponse.json({ message: 'Staff only' }, { status: 403 })
      )
    );
    const user = userEvent.setup();
    renderPanel();

    await user.click(await screen.findByRole('button', { name: /^generate$/i }));
    await user.click(screen.getByRole('button', { name: /generate packing list/i }));

    // Menu hidden for the rest of the session, replaced by a muted note;
    // no error alert is shown.
    expect(
      await screen.findByText(/Document generation is handled by our export team/)
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^generate$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

describe('DocumentsPanel — upload', () => {
  // Deterministic XHR stub mirroring the payments proof-upload tests:
  // records the request and reports one progress event before succeeding.
  class FakeXHR {
    static instances = [];
    constructor() {
      this.upload = {};
      this.headers = {};
      FakeXHR.instances.push(this);
    }
    open(method, url) {
      this.method = method;
      this.url = url;
    }
    setRequestHeader(name, value) {
      this.headers[name] = value;
    }
    send(body) {
      this.body = body;
      this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
      this.status = 200;
      this.responseText = JSON.stringify({ success: true });
      this.onload?.();
    }
  }

  it('sends multipart with file and title fields', async () => {
    vi.stubGlobal('XMLHttpRequest', FakeXHR);
    const user = userEvent.setup();
    renderPanel();

    await screen.findByText('Insurance Certificate');
    await user.type(screen.getByLabelText('Document title'), 'Bill of Lading');
    const file = new File(['bol-bytes'], 'bol.pdf', { type: 'application/pdf' });
    await user.upload(screen.getByLabelText('Document file'), file);
    await user.click(screen.getByRole('button', { name: /^upload$/i }));

    expect(await screen.findByText('Document uploaded.')).toBeInTheDocument();
    expect(FakeXHR.instances).toHaveLength(1);
    const xhr = FakeXHR.instances[0];
    expect(xhr.url).toContain('/orders/order-1/documents/upload');
    expect(xhr.headers.Authorization).toBe('Bearer test-token');
    expect(xhr.body).toBeInstanceOf(FormData);
    expect(xhr.body.get('file')).toBe(file);
    expect(xhr.body.get('title')).toBe('Bill of Lading');

    // Form cleared on success.
    expect(screen.getByLabelText('Document title')).toHaveValue('');

    vi.unstubAllGlobals();
  });
});

describe('DocumentsPanel — download', () => {
  it('downloads through the authenticated blob flow', async () => {
    const downloadRequests = [];
    server.use(
      http.get(`${API_BASE}/orders/:orderId/documents/:docId/download`, ({ params }) => {
        downloadRequests.push(params.docId);
        return new HttpResponse(new Blob(['document-bytes'], { type: 'application/pdf' }), {
          headers: { 'Content-Type': 'application/pdf' },
        });
      })
    );
    // Established mocking approach (see quotes.test.jsx) plus an anchor
    // click spy so jsdom never attempts a real navigation.
    const createObjectURL = vi.fn(() => 'blob:document');
    const revokeObjectURL = vi.fn();
    Object.defineProperty(window.URL, 'createObjectURL', {
      value: createObjectURL,
      configurable: true,
    });
    Object.defineProperty(window.URL, 'revokeObjectURL', {
      value: revokeObjectURL,
      configurable: true,
    });
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {});

    const user = userEvent.setup();
    renderPanel();

    const downloadButtons = await screen.findAllByRole('button', { name: /download/i });
    await user.click(downloadButtons[0]);

    await waitFor(() => expect(downloadRequests).toEqual(['doc-1']));
    await waitFor(() => expect(createObjectURL).toHaveBeenCalled());
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:document');

    clickSpy.mockRestore();
  });
});

describe('DocumentsPanel — staff delete', () => {
  beforeEach(() => {
    server.use(
      http.delete(`${API_BASE}/orders/:orderId/documents/:docId`, ({ params }) => {
        requests.push({ kind: 'delete', docId: params.docId });
        documentsList = documentsList.filter((d) => (d._id ?? d.id) !== params.docId);
        return HttpResponse.json({ success: true });
      })
    );
  });

  it('shows Delete to staff and deletes after the inline confirm', async () => {
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        HttpResponse.json({ success: true, user: adminUser })
      )
    );
    const user = userEvent.setup();
    renderPanel(order, { staff: true });

    const deleteButtons = await screen.findAllByRole('button', { name: /^delete$/i });
    expect(deleteButtons).toHaveLength(3);

    // Two-step inline confirm: Delete -> Confirm/Cancel.
    await user.click(deleteButtons[0]);
    await user.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() =>
      expect(requests).toContainEqual({ kind: 'delete', docId: 'doc-1' })
    );
    await waitFor(() =>
      expect(screen.queryByText('Packing List — Order HAO-2026-100001')).not.toBeInTheDocument()
    );
  });

  it('hides Delete from buyers', async () => {
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        HttpResponse.json({ success: true, user: buyerUser })
      )
    );
    renderPanel();

    expect(await screen.findByText('Insurance Certificate')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument();
  });
});
