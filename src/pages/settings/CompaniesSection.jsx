import React, { useEffect, useState } from 'react';
import { AlertCircle, Building2, CheckCircle2, Plus, Trash2, UserPlus } from 'lucide-react';
import {
  COMPANY_ROLES,
  canApproveOrders,
  canEditCompanyFinances,
  canManageCompany,
  getCompanyId,
  getCompanyMembers,
  getCompanyName,
} from '../../api/companies';
import {
  useAddCompanyMember,
  useApproveOrder,
  useCompany,
  useCompanyOrders,
  useCreateCompany,
  useMyCompanies,
  useRejectOrder,
  useRemoveCompanyMember,
  useUpdateCompany,
  useUpdateCompanyMember,
} from '../../hooks/useCompanies';
import { ApprovalOrderRow } from '../../components/buyer/ApprovalOrderRow';
import { ApprovalStatusChip } from '../../components/buyer/ApprovalStatusChip';

// Companies manager (v0.9 F3): create a company, see "my companies" with
// my role in each, manage members (owner/admin), edit spend limit +
// credit terms (owner only), and work the approval queue — company
// orders with approvalStatus 'pending' get Approve / Reject actions.
// Follows the AddressesSection glass-card + banner pattern.

const errorBannerStyle = {
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
  border: '1px solid rgba(239, 68, 68, 0.35)',
  color: '#F87171',
  padding: '0.85rem',
  borderRadius: 'var(--radius-md)',
  marginBottom: '1rem',
  display: 'flex',
  alignItems: 'center',
  gap: '0.6rem',
  fontSize: '0.85rem',
};

const successBannerStyle = {
  ...errorBannerStyle,
  backgroundColor: 'rgba(34, 197, 94, 0.15)',
  border: '1px solid rgba(34, 197, 94, 0.35)',
  color: '#4ADE80',
};

const rowStyle = {
  backgroundColor: '#111827',
  border: '1px solid var(--border-subtle)',
  borderRadius: 'var(--radius-md)',
  padding: '0.85rem 1rem',
};

export const CompaniesSection = () => {
  const mine = useMyCompanies();
  const myCompanies = mine.data || [];

  const [selectedId, setSelectedId] = useState(null);
  const [newName, setNewName] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  // Default the selection to the first company once the list loads.
  useEffect(() => {
    if (!selectedId && myCompanies.length > 0) {
      setSelectedId(getCompanyId(myCompanies[0].company));
    }
  }, [myCompanies, selectedId]);

  const selectedEntry =
    myCompanies.find((entry) => getCompanyId(entry.company) === selectedId) ||
    null;
  const myRole = selectedEntry?.role || '';
  const manage = canManageCompany(myRole);
  const owner = canEditCompanyFinances(myRole);
  const approver = canApproveOrders(myRole);

  const detail = useCompany(selectedId);
  const company = detail.data || selectedEntry?.company || null;
  const members = getCompanyMembers(company);
  const ordersQuery = useCompanyOrders(selectedId);
  const companyOrders = ordersQuery.data || [];
  const pendingOrders = companyOrders.filter(
    (order) => order.approvalStatus === 'pending'
  );

  const createCompany = useCreateCompany();
  const updateCompany = useUpdateCompany();
  const addMember = useAddCompanyMember();
  const updateMember = useUpdateCompanyMember();
  const removeMember = useRemoveCompanyMember();
  const approveOrder = useApproveOrder();
  const rejectOrder = useRejectOrder();

  // Settings form (name for owner/admin; finances owner-only).
  const [name, setName] = useState('');
  const [spendLimit, setSpendLimit] = useState('');
  const [creditTerms, setCreditTerms] = useState('');
  useEffect(() => {
    if (company) {
      setName(company.name || '');
      setSpendLimit(
        company.spendLimit != null ? String(company.spendLimit) : ''
      );
      setCreditTerms(company.creditTerms || '');
    }
  }, [company?._id, company?.id, company?.name, company?.spendLimit, company?.creditTerms]); // eslint-disable-line react-hooks/exhaustive-deps

  // Invite form.
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');

  const fail = (err, fallback) => setError(err?.message || fallback);

  const handleCreate = (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    createCompany.mutate(newName.trim(), {
      onSuccess: (res) => {
        setNewName('');
        setMessage('Company created.');
        const created = res?.data ?? res;
        const id = created && typeof created === 'object' ? getCompanyId(created.company || created) : null;
        if (id) setSelectedId(id);
      },
      onError: (err) => fail(err, 'Could not create the company.'),
    });
  };

  const handleSaveSettings = (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);
    setMessage(null);
    const patch = {};
    if (manage && name.trim()) patch.name = name.trim();
    if (owner) {
      patch.spendLimit = spendLimit === '' ? null : Number(spendLimit);
      patch.creditTerms = creditTerms;
    }
    updateCompany.mutate(
      { id: selectedId, patch },
      {
        onSuccess: () => setMessage('Company settings saved.'),
        onError: (err) => fail(err, 'Could not save company settings.'),
      }
    );
  };

  const handleInvite = (e) => {
    e.preventDefault();
    if (!selectedId) return;
    setError(null);
    setMessage(null);
    addMember.mutate(
      { id: selectedId, email: inviteEmail.trim(), role: inviteRole },
      {
        onSuccess: () => {
          setInviteEmail('');
          setInviteRole('member');
          setMessage('Member invited.');
        },
        onError: (err) => fail(err, 'Could not invite that member.'),
      }
    );
  };

  const handleApprove = (order) => {
    setError(null);
    approveOrder.mutate(order._id, {
      onSuccess: () => setMessage(`Order ${order.orderNumber || ''} approved.`),
      onError: (err) => fail(err, 'Could not approve that order.'),
    });
  };

  const handleReject = async (order, reason) => {
    setError(null);
    try {
      await rejectOrder.mutateAsync({ orderId: order._id, reason });
      setMessage(`Order ${order.orderNumber || ''} rejected.`);
    } catch (err) {
      fail(err, 'Could not reject that order.');
    }
  };

  return (
    <div className="glass-card" style={{ marginBottom: '1.5rem' }}>
      <h3
        style={{
          color: '#FFFFFF',
          fontSize: '1.1rem',
          marginBottom: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
        }}
      >
        <Building2 size={18} />
        Companies
      </h3>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
        Order on behalf of a company, manage its members, and approve
        company orders that are waiting on you.
      </p>

      {error && (
        <div style={errorBannerStyle} role="alert">
          <AlertCircle size={18} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
      {message && (
        <div style={successBannerStyle}>
          <CheckCircle2 size={18} style={{ flexShrink: 0 }} />
          <span>{message}</span>
        </div>
      )}

      {/* Create a company */}
      <form
        onSubmit={handleCreate}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}
      >
        <div className="form-group" style={{ margin: 0, flex: '1 1 220px' }}>
          <label className="form-label" htmlFor="company-name">
            Company name
          </label>
          <input
            id="company-name"
            type="text"
            className="form-control"
            placeholder="e.g. Apex Industrial Supplies"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={createCompany.isPending || !newName.trim()}
          style={{ alignSelf: 'flex-end', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          <Plus size={16} />
          <span>{createCompany.isPending ? 'Creating...' : 'Create company'}</span>
        </button>
      </form>

      {/* My companies */}
      {mine.isLoading ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading companies…</p>
      ) : mine.isError ? (
        <div>
          <p style={{ color: '#F87171', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
            {mine.error?.message || 'Failed to load companies.'}
          </p>
          <button type="button" onClick={() => mine.refetch()} className="btn btn-secondary btn-sm">
            Try Again
          </button>
        </div>
      ) : myCompanies.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          You don&apos;t belong to any company yet. Create one above to get started.
        </p>
      ) : (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {myCompanies.map((entry) => {
              const id = getCompanyId(entry.company);
              const isSelected = id === selectedId;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedId(id)}
                  style={{
                    ...rowStyle,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    textAlign: 'left',
                    cursor: 'pointer',
                    borderColor: isSelected ? 'var(--accent-amber)' : 'var(--border-subtle)',
                    width: '100%',
                  }}
                >
                  <b style={{ color: '#FFFFFF', fontSize: '0.95rem' }}>
                    {getCompanyName(entry.company)}
                  </b>
                  <span className="badge badge-slate">
                    Your role: {entry.role || 'member'}
                  </span>
                </button>
              );
            })}
          </div>

          {company && (
            <div>
              {/* Settings */}
              <h4 style={{ color: '#FFFFFF', fontSize: '1rem', marginBottom: '0.75rem' }}>
                {getCompanyName(company)} settings
              </h4>
              <form onSubmit={handleSaveSettings} style={{ marginBottom: '1.25rem' }}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '0.75rem',
                  }}
                >
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="company-edit-name">
                      Name
                    </label>
                    <input
                      id="company-edit-name"
                      type="text"
                      className="form-control"
                      value={name}
                      disabled={!manage}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  {owner && (
                    <>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="company-spend-limit">
                          Spend limit (USD)
                        </label>
                        <input
                          id="company-spend-limit"
                          type="number"
                          min="0"
                          className="form-control"
                          value={spendLimit}
                          onChange={(e) => setSpendLimit(e.target.value)}
                        />
                      </div>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label className="form-label" htmlFor="company-credit-terms">
                          Credit terms
                        </label>
                        <input
                          id="company-credit-terms"
                          type="text"
                          className="form-control"
                          placeholder="e.g. Net 30"
                          value={creditTerms}
                          onChange={(e) => setCreditTerms(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                </div>
                {!owner && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                    Spend limit and credit terms can only be edited by the company owner.
                  </p>
                )}
                {(manage || owner) && (
                  <button
                    type="submit"
                    className="btn btn-primary btn-sm"
                    disabled={updateCompany.isPending}
                    style={{ marginTop: '0.75rem' }}
                  >
                    {updateCompany.isPending ? 'Saving...' : 'Save company settings'}
                  </button>
                )}
              </form>

              {/* Members */}
              <h4 style={{ color: '#FFFFFF', fontSize: '1rem', marginBottom: '0.75rem' }}>
                Members
              </h4>
              {members.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                  No members listed for this company yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                  {members.map((member) => (
                    <div
                      key={member.userId}
                      style={{
                        ...rowStyle,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div>
                        <b style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>
                          {member.name || member.email || member.userId}
                        </b>
                        {member.email && member.name && (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', display: 'block' }}>
                            {member.email}
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <label className="form-label" htmlFor={`member-role-${member.userId}`} style={{ margin: 0 }}>
                          Role
                        </label>
                        <select
                          id={`member-role-${member.userId}`}
                          className="form-control"
                          value={member.role}
                          disabled={!manage}
                          onChange={(e) =>
                            updateMember.mutate(
                              { id: selectedId, userId: member.userId, role: e.target.value },
                              { onError: (err) => fail(err, 'Could not change that role.') }
                            )
                          }
                        >
                          {COMPANY_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {role}
                            </option>
                          ))}
                        </select>
                        {manage && (
                          <button
                            type="button"
                            className="btn btn-danger btn-sm"
                            disabled={removeMember.isPending}
                            onClick={() =>
                              removeMember.mutate(
                                { id: selectedId, userId: member.userId },
                                {
                                  onSuccess: () => setMessage('Member removed.'),
                                  onError: (err) => fail(err, 'Could not remove that member.'),
                                }
                              )
                            }
                          >
                            <Trash2 size={14} />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {manage && (
                <form
                  onSubmit={handleInvite}
                  style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: '1.25rem' }}
                >
                  <div className="form-group" style={{ margin: 0, flex: '1 1 200px' }}>
                    <label className="form-label" htmlFor="member-invite-email">
                      Invite by email
                    </label>
                    <input
                      id="member-invite-email"
                      type="email"
                      className="form-control"
                      placeholder="colleague@example.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label className="form-label" htmlFor="member-invite-role">
                      Member role
                    </label>
                    <select
                      id="member-invite-role"
                      className="form-control"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                    >
                      {COMPANY_ROLES.map((role) => (
                        <option key={role} value={role}>
                          {role}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="btn btn-secondary"
                    disabled={addMember.isPending || !inviteEmail.trim()}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <UserPlus size={16} />
                    <span>{addMember.isPending ? 'Inviting...' : 'Invite member'}</span>
                  </button>
                </form>
              )}

              {/* Company orders + approval queue */}
              <h4 style={{ color: '#FFFFFF', fontSize: '1rem', marginBottom: '0.75rem' }}>
                Company orders
              </h4>
              {approver && pendingOrders.length > 0 && (
                <div style={{ marginBottom: '1rem' }}>
                  <p style={{ color: 'var(--accent-amber)', fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem' }}>
                    Awaiting your approval
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {pendingOrders.map((order) => (
                      <ApprovalOrderRow
                        key={order._id}
                        order={order}
                        busy={approveOrder.isPending || rejectOrder.isPending}
                        onApprove={handleApprove}
                        onReject={handleReject}
                      />
                    ))}
                  </div>
                </div>
              )}
              {ordersQuery.isLoading ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Loading company orders…</p>
              ) : companyOrders.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  No orders placed for this company yet.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {companyOrders.map((order) => (
                    <div
                      key={order._id}
                      style={{
                        ...rowStyle,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <b style={{ color: '#FFFFFF', fontSize: '0.9rem' }}>
                        {order.orderNumber || order._id}
                      </b>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        {typeof order.totalAmount === 'number' && (
                          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
                            ${order.totalAmount.toFixed(2)} USD
                          </span>
                        )}
                        <ApprovalStatusChip order={order} />
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CompaniesSection;
