(function () {
  const STORAGE_KEY = 'jgcf2026.reservations';
  const SEQUENCE_KEY = 'jgcf2026.reservationSequence';

  function readAll() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (error) {
      console.warn('Reservation storage could not be read.', error);
      return [];
    }
  }

  function writeAll(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }

  function nextNumber() {
    const next = Number(localStorage.getItem(SEQUENCE_KEY) || '0') + 1;
    localStorage.setItem(SEQUENCE_KEY, String(next));
    return `JGCF-2026-${String(next).padStart(6, '0')}`;
  }

  function create(payload) {
    const reservations = readAll();
    const reservation = {
      id: nextNumber(),
      status: 'confirmed',
      createdAt: new Date().toISOString(),
      ...payload
    };
    reservations.unshift(reservation);
    writeAll(reservations);
    return reservation;
  }

  function findByNumber(number) {
    const value = String(number || '').trim().toUpperCase();
    return readAll().find((item) => item.id.toUpperCase() === value) || null;
  }

  function findForLookup(number, phone) {
    const normalizedPhone = String(phone || '').replace(/\D/g, '');
    const reservation = findByNumber(number);
    if (!reservation) return null;
    const reservationPhone = String(reservation.phone || '').replace(/\D/g, '');
    return reservationPhone === normalizedPhone ? reservation : null;
  }

  function cancel(id) {
    const reservations = readAll();
    const index = reservations.findIndex((item) => item.id === id);
    if (index === -1) return null;
    reservations[index] = {
      ...reservations[index],
      status: 'cancelled',
      cancelledAt: new Date().toISOString()
    };
    writeAll(reservations);
    return reservations[index];
  }

  function availability(companyId, time) {
    const reservations = readAll().filter((item) => (
      item.companyId === companyId &&
      item.time === time &&
      item.status === 'confirmed'
    ));
    return {
      count: reservations.length,
      available: reservations.length < 1
    };
  }

  window.ReservationService = {
    readAll,
    create,
    findByNumber,
    findForLookup,
    cancel,
    availability
  };
})();
