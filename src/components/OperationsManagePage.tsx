import React, { useEffect, useState } from 'react';

/**
 * Type definition for an operation record.
 *
 * This mirrors the fields present in the FastAPI backend's ``Operation``
 * model and associated Pydantic schema. Any field not present in the
 * returned JSON will be optional. Feel free to extend this interface
 * if additional properties are added server‑side.
 */
interface Operation {
  id: number;
  date: string;
  operation_type: string;
  asset_id: number;
  asset_symbol?: string;
  quantity: number;
  wallet_id: number;
  user?: string;
  broker?: string;
  purchase_currency?: string;
  price_manual?: number;
  fees?: number;
  comment?: string;
  [key: string]: any;
}

/**
 * Page component for managing existing operations.
 *
 * On mount it fetches the list of operations from the backend and
 * displays them in a simple table. Each row offers actions to edit
 * or duplicate the corresponding operation. Editing opens an inline
 * form allowing all fields to be modified; saving the changes prompts
 * the user for confirmation before issuing a ``PUT /operations/{id}``
 * request. Duplicating prompts for confirmation and, upon acceptance,
 * sends a ``POST /operations/{id}/duplicate`` request to the server and
 * appends the returned record to the list.
 */
export default function OperationsManagePage() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);

  // Fetch operations on initial mount
  useEffect(() => {
    fetch('/operations/')
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch operations');
        return res.json();
      })
      .then((data) => setOperations(data))
      .catch((err) => {
        console.error(err);
        // fallback with empty array to avoid rendering issues
        setOperations([]);
      });
  }, []);

  /**
   * Handler invoked when the user clicks the "Modifica" button.
   *
   * We create a shallow copy of the selected operation so that
   * changes in the form do not immediately update the table row.
   */
  const handleEdit = (op: Operation) => {
    // Spread to detach from original reference
    setEditingOperation({ ...op });
  };

  /**
   * Handler invoked when the user confirms saving an edited operation.
   *
   * Sends a PUT request to the backend and updates the local state on
   * success. If the server returns an updated record, we replace the
   * corresponding entry in the array; otherwise we simply close the form.
   */
  const handleSaveEdit = () => {
    if (!editingOperation) return;
    const confirmMsg = 'Confermi le modifiche a questa operazione?';
    if (!window.confirm(confirmMsg)) return;
    fetch(`/operations/${editingOperation.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(editingOperation),
    })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to update operation');
        return res.json();
      })
      .then((updated) => {
        setOperations((ops) => ops.map((o) => (o.id === updated.id ? updated : o)));
        setEditingOperation(null);
      })
      .catch((err) => {
        console.error(err);
        // In case of error, keep editing open for retry
      });
  };

  /**
   * Handler invoked when the user cancels editing. It simply closes the form.
   */
  const handleCancelEdit = () => {
    setEditingOperation(null);
  };

  /**
   * Handler invoked when the user clicks the "Duplica" button.
   *
   * Prompts for confirmation before issuing a POST request to duplicate
   * the selected operation. Upon success the new record is appended
   * to the list of operations.
   */
  const handleDuplicate = (op: Operation) => {
    const confirmMsg = 'Sei sicuro di voler duplicare questa operazione?';
    if (!window.confirm(confirmMsg)) return;
    fetch(`/operations/${op.id}/duplicate`, { method: 'POST' })
      .then((res) => {
        if (!res.ok) throw new Error('Failed to duplicate operation');
        return res.json();
      })
      .then((newOp) => {
        setOperations((ops) => [...ops, newOp]);
      })
      .catch((err) => console.error(err));
  };

  /**
   * Generic input change handler for the edit form. It updates the
   * corresponding field on the editingOperation state.
   */
  const handleEditChange = (field: string, value: any) => {
    setEditingOperation((op) => (op ? { ...op, [field]: value } : op));
  };

  return (
    <div>
      <h2>Gestisci operazioni</h2>
      {/* Editing form */}
      {editingOperation && (
        <div style={{ border: '1px solid #ccc', padding: '1rem', marginBottom: '1rem' }}>
          <h3>Modifica operazione #{editingOperation.id}</h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
            {/* Date field */}
            <label>
              Data:
              <input
                type="date"
                value={editingOperation.date.split('T')[0]}
                onChange={(e) => handleEditChange('date', e.target.value)}
              />
            </label>
            {/* Operation type */}
            <label>
              Tipo:
              <input
                type="text"
                value={editingOperation.operation_type || ''}
                onChange={(e) => handleEditChange('operation_type', e.target.value)}
              />
            </label>
            {/* Asset id */}
            <label>
              Asset ID:
              <input
                type="number"
                value={editingOperation.asset_id}
                onChange={(e) => handleEditChange('asset_id', Number(e.target.value))}
              />
            </label>
            {/* Quantity */}
            <label>
              Quantità:
              <input
                type="number"
                value={editingOperation.quantity}
                onChange={(e) => handleEditChange('quantity', Number(e.target.value))}
                step="0.0001"
              />
            </label>
            {/* Wallet ID */}
            <label>
              Wallet ID:
              <input
                type="number"
                value={editingOperation.wallet_id}
                onChange={(e) => handleEditChange('wallet_id', Number(e.target.value))}
              />
            </label>
            {/* User */}
            <label>
              Utente:
              <input
                type="text"
                value={editingOperation.user || ''}
                onChange={(e) => handleEditChange('user', e.target.value)}
              />
            </label>
            {/* Broker */}
            <label>
              Broker:
              <input
                type="text"
                value={editingOperation.broker || ''}
                onChange={(e) => handleEditChange('broker', e.target.value)}
              />
            </label>
            {/* Purchase currency */}
            <label>
              Valuta:
              <input
                type="text"
                value={editingOperation.purchase_currency || ''}
                onChange={(e) => handleEditChange('purchase_currency', e.target.value)}
              />
            </label>
            {/* Price manual */}
            <label>
              Prezzo manuale:
              <input
                type="number"
                step="0.0001"
                value={editingOperation.price_manual || 0}
                onChange={(e) => handleEditChange('price_manual', Number(e.target.value))}
              />
            </label>
            {/* Fees */}
            <label>
              Commissioni:
              <input
                type="number"
                step="0.0001"
                value={editingOperation.fees || 0}
                onChange={(e) => handleEditChange('fees', Number(e.target.value))}
              />
            </label>
            {/* Comment */}
            <label style={{ flexBasis: '100%' }}>
              Commento:
              <input
                type="text"
                value={editingOperation.comment || ''}
                onChange={(e) => handleEditChange('comment', e.target.value)}
                style={{ width: '100%' }}
              />
            </label>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
            <button onClick={handleSaveEdit}>Salva</button>
            <button onClick={handleCancelEdit}>Annulla</button>
          </div>
        </div>
      )}
      {/* Operations table */}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Data</th>
            <th>Tipo</th>
            <th>Asset ID</th>
            <th>Quantità</th>
            <th>Wallet ID</th>
            <th>Utente</th>
            <th>Broker</th>
            <th>Valuta</th>
            <th>Prezzo manuale</th>
            <th>Commissioni</th>
            <th>Commento</th>
            <th>Azione</th>
          </tr>
        </thead>
        <tbody>
          {operations.map((op) => (
            <tr key={op.id} style={{ borderBottom: '1px solid #eee' }}>
              <td>{op.id}</td>
              <td>{new Date(op.date).toLocaleDateString()}</td>
              <td>{op.operation_type}</td>
              <td>{op.asset_id}</td>
              <td>{op.quantity}</td>
              <td>{op.wallet_id}</td>
              <td>{op.user}</td>
              <td>{op.broker}</td>
              <td>{op.purchase_currency}</td>
              <td>{op.price_manual}</td>
              <td>{op.fees}</td>
              <td>{op.comment}</td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <button onClick={() => handleEdit(op)}>Modifica</button>{' '}
                <button onClick={() => handleDuplicate(op)}>Duplica</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}