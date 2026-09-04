// Shared translations for the pin/stats modals (Add Pin, Edit Pin, Stats).
// Mirrors the T-dictionary pattern already used in SettingsScreen.tsx.

export interface PinT {
  addPinTitle: string; editPinTitle: string; statsTitle: string;
  typeSale: string; typeNotInterested: string; typeCallBack: string; typeQuote: string; typeBusinessCard: string;
  descSale: string; descNotInterested: string; descCallBack: string; descQuote: string; descBusinessCard: string;
  leadName: string; leadNameOptional: string; phone: string; phoneOptional: string;
  notes: string; notesPlaceholder: string;
  save: string; saving: string; savePinPrefix: string;
  deletePin: string; deleteConfirmTitle: string; deleteConfirmBody: string; cancel: string;
  address: string; placedAt: string; placedBy: string; coords: string; unknown: string; aiPlaced: string;
  doors: string; sales: string; rate: string; closeRate: string; followUps: string;
  pinBreakdown: string; recentActivity: string; noPinsToday: string;
}

export const PIN_T: Record<string, PinT> = {
  en: {
    addPinTitle: 'Add Pin', editPinTitle: 'Edit Pin', statsTitle: "Today's Stats",
    typeSale: 'Sale', typeNotInterested: 'Not Interested', typeCallBack: 'No Answer', typeQuote: 'Quote', typeBusinessCard: 'Business Card',
    descSale: 'Deal confirmed', descNotInterested: 'Said no', descCallBack: 'No one answered', descQuote: 'Price quote given', descBusinessCard: 'Left a business card',
    leadName: 'Lead Name', leadNameOptional: 'Lead Name (optional)', phone: 'Phone', phoneOptional: 'Phone Number (optional)',
    notes: 'Notes', notesPlaceholder: 'Add notes about this visit...',
    save: 'Save Changes', saving: 'Saving...', savePinPrefix: 'Save',
    deletePin: 'Delete Pin', deleteConfirmTitle: 'Delete this pin?', deleteConfirmBody: 'It will be kept in the recycle bin for 30 days and can be restored from Settings.', cancel: 'Cancel',
    address: 'Address', placedAt: 'Placed at', placedBy: 'Placed by', coords: 'Coords', unknown: 'Unknown', aiPlaced: 'AI',
    doors: 'Doors', sales: 'Sales', rate: 'Rate', closeRate: 'Close Rate', followUps: 'Follow-ups',
    pinBreakdown: 'Pin Breakdown', recentActivity: 'Recent Activity', noPinsToday: 'No pins placed today yet.',
  },
  fr: {
    addPinTitle: 'Ajouter un pin', editPinTitle: 'Modifier le pin', statsTitle: "Stats du jour",
    typeSale: 'Vente', typeNotInterested: 'Non intéressé', typeCallBack: 'Aucune réponse', typeQuote: 'Soumission', typeBusinessCard: "Carte d'affaire",
    descSale: 'Vente confirmée', descNotInterested: 'A refusé', descCallBack: "Personne n'a répondu", descQuote: 'Soumission remise', descBusinessCard: "Carte d'affaire laissée",
    leadName: 'Nom du lead', leadNameOptional: 'Nom du lead (optionnel)', phone: 'Téléphone', phoneOptional: 'Numéro de téléphone (optionnel)',
    notes: 'Notes', notesPlaceholder: 'Ajouter des notes sur cette visite...',
    save: 'Enregistrer', saving: 'Enregistrement...', savePinPrefix: 'Enregistrer',
    deletePin: 'Supprimer le pin', deleteConfirmTitle: 'Supprimer ce pin?', deleteConfirmBody: 'Il sera conservé dans la corbeille pendant 30 jours et pourra être restauré depuis les Réglages.', cancel: 'Annuler',
    address: 'Adresse', placedAt: 'Placé à', placedBy: 'Placé par', coords: 'Coordonnées', unknown: 'Inconnu', aiPlaced: 'IA',
    doors: 'Portes', sales: 'Ventes', rate: 'Taux', closeRate: 'Taux de conversion', followUps: 'Rappels',
    pinBreakdown: 'Répartition des pins', recentActivity: 'Activité récente', noPinsToday: 'Aucun pin placé aujourd\'hui.',
  },
  es: {
    addPinTitle: 'Añadir pin', editPinTitle: 'Editar pin', statsTitle: 'Estadísticas de hoy',
    typeSale: 'Venta', typeNotInterested: 'No interesado', typeCallBack: 'Sin respuesta', typeQuote: 'Cotización', typeBusinessCard: 'Tarjeta de presentación',
    descSale: 'Venta confirmada', descNotInterested: 'Dijo que no', descCallBack: 'Nadie respondió', descQuote: 'Cotización entregada', descBusinessCard: 'Tarjeta de presentación dejada',
    leadName: 'Nombre del cliente', leadNameOptional: 'Nombre del cliente (opcional)', phone: 'Teléfono', phoneOptional: 'Número de teléfono (opcional)',
    notes: 'Notas', notesPlaceholder: 'Añade notas sobre esta visita...',
    save: 'Guardar cambios', saving: 'Guardando...', savePinPrefix: 'Guardar',
    deletePin: 'Eliminar pin', deleteConfirmTitle: '¿Eliminar este pin?', deleteConfirmBody: 'Se conservará en la papelera durante 30 días y podrá restaurarse desde Ajustes.', cancel: 'Cancelar',
    address: 'Dirección', placedAt: 'Colocado a las', placedBy: 'Colocado por', coords: 'Coordenadas', unknown: 'Desconocido', aiPlaced: 'IA',
    doors: 'Puertas', sales: 'Ventas', rate: 'Tasa', closeRate: 'Tasa de cierre', followUps: 'Seguimientos',
    pinBreakdown: 'Desglose de pins', recentActivity: 'Actividad reciente', noPinsToday: 'Aún no se han colocado pins hoy.',
  },
};

export function getPinT(lang: string | undefined): PinT {
  return PIN_T[lang || 'fr'] || PIN_T.fr;
}
