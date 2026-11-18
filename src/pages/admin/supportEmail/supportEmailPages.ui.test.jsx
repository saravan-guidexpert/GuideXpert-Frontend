import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { AuthContext } from '../../../contexts/AuthContext'

vi.mock('../../../utils/adminApi', () => ({
  getStoredToken: vi.fn(() => 'token'),
  getSupportEmailOverview: vi.fn(),
  listSupportEmailTickets: vi.fn(),
  getSupportEmailTicket: vi.fn(),
  reviewSupportEmailTicket: vi.fn(),
  listSupportEmailJobs: vi.fn(),
  retrySupportEmailJob: vi.fn(),
  getSupportEmailHealth: vi.fn(),
  testSupportEmailGraphAuthentication: vi.fn(),
  getSingleEmailTestReadiness: vi.fn(),
  runSingleEmailTest: vi.fn(),
  supportEmailAttachmentUrl: vi.fn((id) => `/attachments/${id}`),
}))

import * as api from '../../../utils/adminApi'
import OverviewPage from './OverviewPage'
import TicketsPage from './TicketsPage'
import TicketDetailPage from './TicketDetailPage'
import ProcessingPage from './ProcessingPage'
import HealthPage from './HealthPage'
import SingleEmailTestPage from './SingleEmailTestPage'

const ok = (data) => Promise.resolve({ success: true, data })
const fail = (message, data) => Promise.resolve({ success: false, message, data })

function renderWith(ui, { user = { isSuperAdmin: true }, path = '/', route } = {}) {
  const tree = route
    ? (
      <Routes>
        <Route path={route} element={ui} />
      </Routes>
    )
    : ui
  return render(
    <AuthContext.Provider value={{ user }}>
      <MemoryRouter initialEntries={[path]}>{tree}</MemoryRouter>
    </AuthContext.Provider>
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

const overview = {
  totals: { emails: 12, processed: 9, tickets: 8, pending: 2, needsReview: 3, failed: 1, highPriority: 2, urgent: 1 },
  emailTrend: [{ day: '2026-11-18', count: 12 }],
  processingTrend: [{ day: '2026-11-18', state: 'completed', count: 9 }],
  categories: [{ category: 'other', count: 2 }],
  priorities: [{ priority: 'high', count: 2 }],
  ai: [{ outcome: 'success', count: 8 }],
  recentTickets: [{ id: 't1', ticketNumber: 'GX-1', subject: 'Fee receipt', category: 'billing', priority: 'high', status: 'open', receivedAt: '2026-11-18T10:00:00Z' }],
  recentFailures: [{ id: 'j1', stage: 'ai', state: 'dead_letter', subject: 'Portal down', reason: 'ai_timeout', attempts: 5, maxAttempts: 5, updatedAt: '2026-11-18T11:00:00Z' }],
}

describe('Overview', () => {
  it('shows totals, recent tickets and recent failures without any Sheets figures', async () => {
    api.getSupportEmailOverview.mockReturnValue(ok({ overview }))
    renderWith(<OverviewPage />)
    expect(await screen.findByText('Emails')).toBeInTheDocument()
    expect(screen.getByText('Emails').nextSibling).toHaveTextContent('12')
    const recent = screen.getByLabelText('Recent tickets')
    expect(within(recent).getByRole('link', { name: 'GX-1' })).toHaveAttribute('href', '/admin/support-email/tickets/t1')
    const failures = screen.getByLabelText('Recent processing failures')
    expect(within(failures).getByText(/ai_timeout/)).toBeInTheDocument()
    expect(screen.queryByText(/sheets/i)).toBeNull()
  })

  it('switches range, requires both custom dates, and refreshes', async () => {
    api.getSupportEmailOverview.mockReturnValue(ok({ overview }))
    renderWith(<OverviewPage />)
    await screen.findByText('Emails')
    expect(api.getSupportEmailOverview).toHaveBeenLastCalledWith({ preset: '7d', from: '', to: '' })

    fireEvent.click(screen.getByRole('button', { name: 'Today' }))
    await waitFor(() => expect(api.getSupportEmailOverview).toHaveBeenLastCalledWith({ preset: 'today', from: '', to: '' }))

    const calls = api.getSupportEmailOverview.mock.calls.length
    fireEvent.click(screen.getByRole('button', { name: 'Custom' }))
    expect(await screen.findByText('Choose a start and end date.')).toBeInTheDocument()
    expect(api.getSupportEmailOverview.mock.calls.length).toBe(calls)

    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(api.getSupportEmailOverview.mock.calls.length).toBe(calls))
  })

  it('shows the error state', async () => {
    api.getSupportEmailOverview.mockReturnValue(fail('request_failed'))
    renderWith(<OverviewPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('request_failed')
  })
})

const ticketRow = {
  id: 't1', ticketNumber: 'GX-1', subject: 'Fee receipt', sender: { email: 'asha@example.com' },
  category: 'billing', priority: 'high', status: 'open', processingStatus: 'processing', updatedAt: '2026-11-18T10:00:00Z',
}

describe('Tickets', () => {
  it('sends filters, shows processing status, and paginates with the server page count', async () => {
    api.listSupportEmailTickets.mockImplementation(() => ok({ tickets: [ticketRow], total: 45, pages: 3, page: 1, limit: 20 }))
    renderWith(<TicketsPage />)
    await screen.findAllByText('GX-1')
    expect(screen.getAllByText(/processing/).length).toBeGreaterThan(0)
    expect(screen.getByText('45 tickets · page 1 of 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    await screen.findByText('45 tickets · page 2 of 3')
    expect(api.listSupportEmailTickets).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2, limit: 20 }))

    fireEvent.change(screen.getByLabelText('Search tickets'), { target: { value: 'receipt' } })
    await waitFor(() => expect(api.listSupportEmailTickets).toHaveBeenLastCalledWith(expect.objectContaining({ q: 'receipt', page: 1 })))

    fireEvent.change(screen.getByLabelText('Received from'), { target: { value: '2026-11-01' } })
    fireEvent.change(screen.getByLabelText('Received to'), { target: { value: '2026-11-10' } })
    await waitFor(() => expect(api.listSupportEmailTickets).toHaveBeenLastCalledWith(expect.objectContaining({ from: '2026-11-01', to: '2026-11-10' })))

    fireEvent.change(screen.getByLabelText('Category'), { target: { value: 'other' } })
    await waitFor(() => expect(api.listSupportEmailTickets).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'other' })))
  })

  it('refreshes on demand, disables Next on the last page, and shows empty and error states', async () => {
    api.listSupportEmailTickets.mockImplementationOnce(() => ok({ tickets: [], total: 0, pages: 1 }))
    renderWith(<TicketsPage />)
    expect(await screen.findByText('Nothing matches these filters.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled()

    api.listSupportEmailTickets.mockImplementationOnce(() => fail('request_failed'))
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('request_failed')
    expect(api.listSupportEmailTickets).toHaveBeenCalledTimes(2)
  })

  it('locks the status to needs_review in the review queue', async () => {
    api.listSupportEmailTickets.mockImplementation(() => ok({ tickets: [], total: 0, pages: 1 }))
    renderWith(<TicketsPage reviewOnly />)
    await screen.findByText('Human review queue')
    expect(api.listSupportEmailTickets).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'needs_review', review: '1' }))
  })
})

const ticketDetail = {
  id: 't1', ticketNumber: 'GX-1', category: 'other', subCategory: '', priority: 'medium', status: 'needs_review',
  sentiment: 'neutral', confidence: 0.5, summary: 'Needs a look', subject: 'Question', sender: { name: 'Asha', email: 'asha@example.com' },
  receivedAt: '2026-11-18T10:00:00Z', bodyText: 'Hello there', internetMessageId: 'abc@example.com',
  pipeline: { state: 'completed', fetch: 'fetched', attachments: 'extracted', ai: 'classified', ticket: 'created' },
  recipients: { to: [{ email: 'support@niatindia.com' }], cc: [{ email: 'lead@example.com' }] },
  retry: { totalAttempts: 3, failedJobs: 1, lastError: 'ai_timeout' },
  classification: { category: 'other', needsHumanReview: true, reviewReason: 'unknown_category' },
  conversation: [],
  attachments: [
    { id: 'a1', name: 'shot.png', contentType: 'image/png', size: 10, extractStatus: 'unsupported', extractError: 'image_text_extraction_unavailable', hasFile: true, textAvailable: false },
    { id: 'a2', name: 'scan.pdf', contentType: 'application/pdf', size: 20, extractStatus: 'extracted', hasFile: true, textAvailable: false },
    { id: 'a3', name: 'letter.docx', contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', size: 30, extractStatus: 'extracted', extractedText: 'Need a slot', hasFile: true, textAvailable: true },
  ],
  processingHistory: [
    { kind: 'job', stage: 'ai', state: 'dead_letter', attempts: 3, maxAttempts: 3, error: 'ai_timeout', at: '2026-11-18T10:05:00Z' },
    { kind: 'single_email_test', stage: 'single_email_test', state: 'completed', promptVersion: 'v1.3', at: '2026-11-18T10:06:00Z' },
  ],
  auditHistory: [{ id: 'x1', action: 'ticket_reviewed', actor: 'Agent', createdAt: '2026-11-18T10:07:00Z', details: { outcome: 'ok' } }],
  events: [],
}

describe('Ticket detail', () => {
  function renderDetail() {
    return renderWith(<TicketDetailPage />, { path: '/admin/support-email/tickets/t1', route: '/admin/support-email/tickets/:id' })
  }

  it('shows recipients, history, retry info and a not-analysed notice for images and scanned PDFs only', async () => {
    api.getSupportEmailTicket.mockReturnValue(ok({ ticket: ticketDetail }))
    renderDetail()
    expect(await screen.findByText('GX-1')).toBeInTheDocument()
    expect(screen.getByText('support@niatindia.com')).toBeInTheDocument()
    expect(screen.getByText('lead@example.com')).toBeInTheDocument()
    expect(screen.getByText('abc@example.com')).toBeInTheDocument()
    expect(screen.getByText(/last error ai_timeout/)).toBeInTheDocument()

    const processing = screen.getByLabelText('Processing history')
    expect(within(processing).getByText(/ai dead_letter · attempts 3\/3/)).toBeInTheDocument()
    expect(within(processing).getByText(/Single email test completed · prompt v1.3/)).toBeInTheDocument()
    const audit = screen.getByLabelText('Audit history')
    expect(within(audit).getByText(/ticket reviewed by Agent/)).toBeInTheDocument()

    const notices = screen.getAllByRole('note')
    expect(notices).toHaveLength(2)
    notices.forEach((node) => expect(node).toHaveTextContent('Not analysed'))
    expect(screen.queryByText(/sheets/i)).toBeNull()
  })

  it('saves a review once, shows the saved notice, and does not double submit', async () => {
    api.getSupportEmailTicket.mockReturnValue(ok({ ticket: ticketDetail }))
    let release
    api.reviewSupportEmailTicket.mockImplementation(() => new Promise((resolve) => { release = () => resolve({ success: true, data: {} }) }))
    renderDetail()
    await screen.findByText('GX-1')
    fireEvent.change(screen.getByLabelText('Priority'), { target: { value: 'high' } })
    fireEvent.change(screen.getByLabelText('Note'), { target: { value: 'Escalated' } })
    const button = screen.getByRole('button', { name: 'Save review' })
    fireEvent.click(button)
    fireEvent.click(button)
    expect(await screen.findByRole('button', { name: 'Saving' })).toBeDisabled()
    expect(api.reviewSupportEmailTicket).toHaveBeenCalledTimes(1)
    expect(api.reviewSupportEmailTicket).toHaveBeenCalledWith('t1', expect.objectContaining({ priority: 'high', note: 'Escalated', category: 'other' }))
    release()
    expect(await screen.findByText('Review saved. No email was sent.')).toBeInTheDocument()
  })

  it('shows the save error without a saved notice', async () => {
    api.getSupportEmailTicket.mockReturnValue(ok({ ticket: ticketDetail }))
    api.reviewSupportEmailTicket.mockReturnValue(fail('review_empty'))
    renderDetail()
    await screen.findByText('GX-1')
    fireEvent.click(screen.getByRole('button', { name: 'Save review' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('review_empty')
    expect(screen.queryByText('Review saved. No email was sent.')).toBeNull()
  })

  it('shows an error when the ticket cannot be loaded', async () => {
    api.getSupportEmailTicket.mockReturnValue(fail('ticket_not_found'))
    renderDetail()
    expect(await screen.findByRole('alert')).toHaveTextContent('ticket_not_found')
  })
})

const jobs = {
  counts: { pending: 4, processing: 1, failed: 2, dead_letter: 3, completed: 9 },
  startsWorker: false,
  jobs: [
    { id: 'j1', stage: 'ai', state: 'dead_letter', reason: 'ai_timeout', lastError: 'ai_timeout', attempts: 5, maxAttempts: 5, lastAttempt: '2026-11-18T10:00:00Z' },
    { id: 'j2', stage: 'sheets', state: 'dead_letter', reason: 'old', lastError: 'old', attempts: 5, maxAttempts: 5, lastAttempt: '2026-11-18T10:00:00Z' },
  ],
  attachmentFailures: [],
  graphFailures: [],
}

describe('Processing', () => {
  it('shows queue counts, retry counts and last errors, and the retry copy says it does not start the worker', async () => {
    api.listSupportEmailJobs.mockImplementation(() => ok(jobs))
    api.retrySupportEmailJob.mockReturnValue(ok({}))
    renderWith(<ProcessingPage />)
    const counts = await screen.findByLabelText('Queue counts')
    expect(within(counts).getByText('Pending').nextSibling).toHaveTextContent('4')
    expect(within(counts).getByText('Dead letter').nextSibling).toHaveTextContent('3')
    expect(screen.getAllByText(/Retry count 5\/5/)).toHaveLength(2)
    expect(screen.getAllByText(/Last error: ai_timeout/)).toHaveLength(1)
    expect(screen.getByText('Retired step')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Queue retry' })).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'Queue retry' }))
    expect(await screen.findByText('Queued for the existing worker. This does not start processing by itself.')).toBeInTheDocument()
    expect(api.retrySupportEmailJob).toHaveBeenCalledWith('j1')
    await waitFor(() => expect(api.listSupportEmailJobs.mock.calls.length).toBeGreaterThan(1))
  })

  it('shows a failed retry message', async () => {
    api.listSupportEmailJobs.mockImplementation(() => ok(jobs))
    api.retrySupportEmailJob.mockReturnValue(fail('job_not_retryable'))
    renderWith(<ProcessingPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Queue retry' }))
    expect(await screen.findByText('job_not_retryable')).toBeInTheDocument()
  })

  it('shows the error state', async () => {
    api.listSupportEmailJobs.mockReturnValue(fail('request_failed'))
    renderWith(<ProcessingPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('request_failed')
  })
})

const health = {
  sync: { lastSuccessfulAt: null, cursors: [] },
  webhook: null,
  subscriptions: [],
  queue: [],
  processing: [],
  storage: { files: 0, declaredBytes: 0 },
  retention: {},
  ingestion: { approvedMailbox: 'support@niatindia.com', mailboxScope: 'MAILBOX_SCOPE_UNVERIFIED', processingEnabled: false, policies: [] },
  summary: { verified: 1, failed: 2, unknown: 1 },
  items: [
    { key: 'graph_auth', label: 'Graph authentication', verified: 'unknown', detail: 'The Graph token test has not been run.' },
    { key: 'database', label: 'Database', verified: true, detail: 'Database connection is open.' },
    { key: 'exchange_scope', label: 'Exchange mailbox scope', verified: false, value: 'MAILBOX_SCOPE_UNVERIFIED', detail: 'MAILBOX_SCOPE_UNVERIFIED: Exchange Online application RBAC for the approved mailbox is not recorded.' },
    { key: 'subscription', label: 'Graph subscription', verified: false, detail: 'No active, unexpired subscription is recorded.' },
  ],
}

describe('Health', () => {
  it('separates verified from unknown and never labels unknown as verified', async () => {
    api.getSupportEmailHealth.mockImplementation(() => ok({ health }))
    renderWith(<HealthPage />)
    const graph = await screen.findByTestId('health-graph_auth')
    expect(within(graph).getByText('Unknown')).toBeInTheDocument()
    expect(within(graph).queryByText('Verified')).toBeNull()
    expect(within(screen.getByTestId('health-database')).getByText('Verified')).toBeInTheDocument()
    const scope = screen.getByTestId('health-exchange_scope')
    expect(within(scope).getByText('Not verified')).toBeInTheDocument()
    expect(scope).toHaveTextContent('Exchange Online application RBAC for the approved mailbox is not recorded')
    expect(screen.getByText(/1 verified · 2 not verified · 1 unknown/)).toBeInTheDocument()
  })

  it('offers the Graph token test to a super admin only, and records the result', async () => {
    api.getSupportEmailHealth.mockImplementation(() => ok({ health }))
    api.testSupportEmailGraphAuthentication.mockReturnValue(ok({ graph: { ok: true, code: 'graph_token_ok' } }))
    const { unmount } = renderWith(<HealthPage />, { user: { isSuperAdmin: true } })
    fireEvent.click(await screen.findByRole('button', { name: 'Test Graph authentication' }))
    expect(await screen.findByText(/Token acquisition: succeeded/)).toBeInTheDocument()
    await waitFor(() => expect(api.getSupportEmailHealth.mock.calls.length).toBeGreaterThan(1))
    unmount()
    renderWith(<HealthPage />, { user: { isSuperAdmin: false } })
    await screen.findByTestId('health-database')
    expect(screen.queryByRole('button', { name: 'Test Graph authentication' })).toBeNull()
  })

  it('shows an error when health cannot be loaded', async () => {
    api.getSupportEmailHealth.mockReturnValue(fail('request_failed'))
    renderWith(<HealthPage />)
    expect(await screen.findByRole('alert')).toHaveTextContent('request_failed')
  })
})

const readyReadiness = { blockers: [] }
const MESSAGE_ID = 'AAMkAGSingleEmailTest0001'

describe('Single email test', () => {
  it('blocks non super admins', () => {
    renderWith(<SingleEmailTestPage />, { user: { isSuperAdmin: false } })
    expect(screen.getByRole('alert')).toHaveTextContent('Super admin access is required')
    expect(api.getSingleEmailTestReadiness).not.toHaveBeenCalled()
  })

  it('disables the button while blockers exist and lists them', async () => {
    api.getSingleEmailTestReadiness.mockReturnValue(ok({ readiness: { blockers: ['MAILBOX_SCOPE_UNVERIFIED'] } }))
    renderWith(<SingleEmailTestPage />)
    expect(await screen.findByText('MAILBOX_SCOPE_UNVERIFIED')).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Graph message id'), { target: { value: MESSAGE_ID } })
    expect(screen.getByRole('button', { name: 'Run single email test' })).toBeDisabled()
  })

  it('asks for confirmation and does nothing when cancelled', async () => {
    api.getSingleEmailTestReadiness.mockReturnValue(ok({ readiness: readyReadiness }))
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    renderWith(<SingleEmailTestPage />)
    await waitFor(() => expect(api.getSingleEmailTestReadiness).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText('Graph message id'), { target: { value: MESSAGE_ID } })
    const button = await screen.findByRole('button', { name: 'Run single email test' })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(api.runSingleEmailTest).not.toHaveBeenCalled()
  })

  it('submits once, shows loading, then the ticket link; a second click while running is ignored', async () => {
    api.getSingleEmailTestReadiness.mockReturnValue(ok({ readiness: readyReadiness }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    let release
    api.runSingleEmailTest.mockImplementation(() => new Promise((resolve) => {
      release = () => resolve({ success: true, data: { result: { ticket: { id: 't9', ticketNumber: 'GX-9', category: 'feedback', priority: 'high', sentiment: 'negative', confidence: 0.91, status: 'open' } } } })
    }))
    renderWith(<SingleEmailTestPage />)
    fireEvent.change(await screen.findByLabelText('Graph message id'), { target: { value: MESSAGE_ID } })
    const button = screen.getByRole('button', { name: 'Run single email test' })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    fireEvent.submit(button.closest('form'))
    expect(await screen.findByRole('button', { name: 'Running test' })).toBeDisabled()
    expect(api.runSingleEmailTest).toHaveBeenCalledTimes(1)
    expect(api.runSingleEmailTest).toHaveBeenCalledWith(MESSAGE_ID)
    release()
    const link = await screen.findByRole('link', { name: 'GX-9' })
    expect(link).toHaveAttribute('href', '/admin/support-email/tickets/t9')
  })

  it('shows a duplicate message with a link to the existing ticket', async () => {
    api.getSingleEmailTestReadiness.mockReturnValue(ok({ readiness: readyReadiness }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    api.runSingleEmailTest.mockReturnValue(fail('duplicate_test_request', { ticketId: 'existing1' }))
    renderWith(<SingleEmailTestPage />)
    fireEvent.change(await screen.findByLabelText('Graph message id'), { target: { value: MESSAGE_ID } })
    const button = screen.getByRole('button', { name: 'Run single email test' })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('already processed')
    expect(within(alert).getByRole('link', { name: 'Open the existing ticket' })).toHaveAttribute('href', '/admin/support-email/tickets/existing1')
  })

  it('shows processing errors in plain words and refreshes blockers from the response', async () => {
    api.getSingleEmailTestReadiness.mockReturnValue(ok({ readiness: readyReadiness }))
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    api.runSingleEmailTest.mockReturnValue(fail('MAILBOX_SCOPE_UNVERIFIED', { readiness: { blockers: ['MAILBOX_SCOPE_UNVERIFIED'] } }))
    renderWith(<SingleEmailTestPage />)
    fireEvent.change(await screen.findByLabelText('Graph message id'), { target: { value: MESSAGE_ID } })
    const button = screen.getByRole('button', { name: 'Run single email test' })
    await waitFor(() => expect(button).toBeEnabled())
    fireEvent.click(button)
    expect(await screen.findByRole('alert')).toHaveTextContent('Exchange mailbox scope is not verified')
    await waitFor(() => expect(screen.getByRole('button', { name: 'Run single email test' })).toBeDisabled())
  })

  it('runs the Graph token test without reading mailbox data', async () => {
    api.getSingleEmailTestReadiness.mockReturnValue(ok({ readiness: readyReadiness }))
    api.testSupportEmailGraphAuthentication.mockReturnValue(ok({ graph: { ok: true, code: 'graph_token_ok' } }))
    renderWith(<SingleEmailTestPage />)
    fireEvent.click(await screen.findByRole('button', { name: 'Test Graph token' }))
    expect(await screen.findByText(/Graph token: acquired/)).toHaveTextContent('No mailbox data was read.')
    expect(api.runSingleEmailTest).not.toHaveBeenCalled()
  })
})
