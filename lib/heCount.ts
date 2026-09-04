// Hebrew counted nouns, for the admin dashboard.
//
// "1 פניות" is wrong in a way that reads as machine output, and the dashboard
// hits the singular constantly at this volume - most rows on most cards are a
// one. Hebrew also has a distinct dual for some nouns, which none of these
// need, so a two-form helper is enough.

export const enquiries = (n: number) => (n === 1 ? 'פנייה אחת' : `${n} פניות`);
export const visits = (n: number) => (n === 1 ? 'ביקור אחד' : `${n} ביקורים`);
export const readers = (n: number) => (n === 1 ? 'קורא אחד' : `${n} קוראים`);
