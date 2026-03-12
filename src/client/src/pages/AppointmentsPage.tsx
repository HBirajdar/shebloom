// @ts-nocheck
import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAyurvedaStore } from '../stores/ayurvedaStore';
import { useAuthStore } from '../stores/authStore';
import { doctorAPI, paymentAPI } from '../services/api';
// Bug A fix: import and use the useAppointments hook
import { useAppointments } from '../hooks/useAppointments';
import { prescriptionAPI } from '../services/api';
import toast from 'react-hot-toast';

const fallbackTimeSlots = ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM', '04:30 PM', '05:00 PM'];
const reasons = ['General Consultation', 'PCOD/PCOS', 'Period Problems', 'Fertility Consultation', 'Pregnancy Care', 'Hair & Skin', 'Hormonal Imbalance', 'Nutrition Advice', 'Product Guidance', 'Other'];

export default function AppointmentsPage() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const store = useAyurvedaStore();
  const user = useAuthStore(s => s.user);

  // Read doctorId from URL (passed from DoctorsPage)
  const preselectedDoctorId = searchParams.get('doctorId');

  // Fetch doctors from API, fall back to zustand defaults
  const [apiDoctors, setApiDoctors] = useState<any[] | null>(null);
  useEffect(() => {
    doctorAPI.search({})
      .then(result => {
        const items = result.data?.data || [];
        if (items.length > 0) {
          // Backend mapDoctor already maps fields (name, experience, fee, etc.)
          setApiDoctors(items);
        }
      })
      .catch(() => {});
  }, []);

  const doctors = apiDoctors || store.doctors;
  const pubDoctors = doctors.filter(d => d.isPublished);
  const chief = pubDoctors.find(d => d.isChief);

  // Bug A fix: use useAppointments hook — replaces local state + useEffect + confirmBooking + cancelBooking
  const { bookings, createBooking, cancelBooking, loading } = useAppointments();

  const [view, setView] = useState<'book' | 'my'>('book');
  const [step, setStep] = useState(0);
  const [selDoc, setSelDoc] = useState<string>(chief?.id || '');

  // Auto-select doctor from URL param and skip to step 1
  const [didAutoSelect, setDidAutoSelect] = useState(false);
  useEffect(() => {
    if (preselectedDoctorId && pubDoctors.length > 0 && !didAutoSelect) {
      const found = pubDoctors.find(d => d.id === preselectedDoctorId);
      if (found && found.isAvailable !== false) {
        setSelDoc(found.id);
        setStep(1);
        setDidAutoSelect(true);
      }
    }
  }, [preselectedDoctorId, pubDoctors, didAutoSelect]);
  const [selDate, setSelDate] = useState('');
  const [selTime, setSelTime] = useState('');
  const [selReason, setSelReason] = useState('');
  const [notes, setNotes] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [lastVideoLink, setLastVideoLink] = useState('');

  // Doctor slots for dynamic time selection
  const [doctorSlots, setDoctorSlots] = useState<any[]>([]);
  const [doctorAvailable, setDoctorAvailable] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);

  // Prescription viewer state
  const [rxModal, setRxModal] = useState<{ open: boolean; data: any; loading: boolean }>({ open: false, data: null, loading: false });

  const viewPrescription = async (appointmentId: string) => {
    setRxModal({ open: true, data: null, loading: true });
    try {
      const res = await prescriptionAPI.byAppointment(appointmentId);
      setRxModal({ open: true, data: res.data.data || res.data, loading: false });
    } catch {
      setRxModal({ open: false, data: null, loading: false });
      toast.error('No prescription found for this appointment');
    }
  };

  // Fetch doctor slots when doctor changes
  useEffect(() => {
    if (!selDoc) return;
    setSlotsLoading(true);
    doctorAPI.getSlots(selDoc)
      .then(res => {
        const data = res.data?.data || {};
        setDoctorSlots(data.slots || []);
        setDoctorAvailable(data.isAvailable !== false);
      })
      .catch(() => { setDoctorSlots([]); setDoctorAvailable(true); })
      .finally(() => setSlotsLoading(false));
  }, [selDoc]);

  // Generate time slots from doctor's availability for selected date
  const getTimeSlotsForDate = (dateStr: string) => {
    if (!dateStr) return fallbackTimeSlots;
    const dayOfWeek = new Date(dateStr).getDay();
    const daySlots = doctorSlots.filter(s => s.dayOfWeek === dayOfWeek && s.isActive);
    if (daySlots.length === 0) return fallbackTimeSlots;

    const times: string[] = [];
    daySlots.forEach(slot => {
      let [sh, sm] = slot.startTime.split(':').map(Number);
      const [eh, em] = slot.endTime.split(':').map(Number);
      while (sh < eh || (sh === eh && sm < em)) {
        const h12 = sh === 0 ? 12 : sh > 12 ? sh - 12 : sh;
        const meridiem = sh < 12 ? 'AM' : 'PM';
        times.push(`${String(h12).padStart(2, '0')}:${String(sm).padStart(2, '0')} ${meridiem}`);
        sm += 30;
        if (sm >= 60) { sh++; sm = 0; }
      }
    });
    return times.length > 0 ? times : fallbackTimeSlots;
  };

  const timeSlots = getTimeSlotsForDate(selDate);

  // Next 14 days
  const dates = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i + 1);
    return { full: d.toISOString().split('T')[0], day: d.toLocaleDateString('en', { weekday: 'short' }), date: d.getDate(), month: d.toLocaleDateString('en', { month: 'short' }) };
  });

  const selectedDoctor = pubDoctors.find(d => d.id === selDoc);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Complete booking after payment (or directly if free)
  const completeBooking = async (paymentId?: string) => {
    const doc = pubDoctors.find(d => d.id === selDoc);
    const result = await createBooking({
      doctorId: selDoc,
      doctorName: doc?.name || 'Doctor',
      date: selDate,
      time: selTime,
      reason: selReason,
      notes: paymentId ? `${notes}${notes ? ' | ' : ''}Payment: ${paymentId}` : notes,
    });
    setLastVideoLink(result?.videoLink || result?.meetingLink || '');
    setShowSuccess(true);
    setStep(0); setSelDate(''); setSelTime(''); setSelReason(''); setNotes('');
  };

  // Handle booking with Razorpay payment
  const handleConfirmBooking = async () => {
    if (!selDoc || !selDate || !selTime || !selReason) { toast.error('Please fill all fields'); return; }
    const doc = pubDoctors.find(d => d.id === selDoc);
    const fee = doc?.fee || 0;

    // If free consultation, book directly
    if (fee <= 0) {
      await completeBooking();
      return;
    }

    // Start Razorpay payment
    setPaymentProcessing(true);
    try {
      const orderRes = await paymentAPI.createAppointmentOrder({ doctorId: selDoc, amount: fee });
      const orderData = orderRes.data?.data || orderRes.data;

      // If backend says free (fee=0 in DB), book directly
      if (orderData.free) {
        await completeBooking();
        setPaymentProcessing(false);
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency || 'INR',
        name: 'VedaClue',
        description: `Consultation with Dr. ${doc?.name || 'Doctor'}`,
        order_id: orderData.razorpayOrderId,
        handler: async (response: any) => {
          try {
            // Verify payment
            await paymentAPI.verifyAppointmentPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            });
            toast.success('Payment successful!');
            await completeBooking(response.razorpay_payment_id);
          } catch {
            toast.error('Payment verification failed. Please contact support.');
          }
          setPaymentProcessing(false);
        },
        prefill: {
          name: user?.fullName || '',
          email: user?.email || '',
          contact: user?.phone || '',
        },
        theme: { color: '#E11D48' },
        modal: {
          ondismiss: () => {
            setPaymentProcessing(false);
            toast('Payment cancelled', { icon: '⚠️' });
          },
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (response: any) => {
        setPaymentProcessing(false);
        toast.error(response.error?.description || 'Payment failed. Please try again.');
      });
      rzp.open();
    } catch (err: any) {
      setPaymentProcessing(false);
      toast.error(err?.response?.data?.message || 'Could not initiate payment. Please try again.');
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-50">
      <div className="sticky top-0 z-20 backdrop-blur-xl border-b border-rose-100" style={{ backgroundColor: 'rgba(255,241,242,0.85)' }}>
        <div className="px-5 py-3 flex items-center gap-2.5">
          <button onClick={() => nav('/dashboard')} className="w-9 h-9 rounded-2xl bg-white/80 flex items-center justify-center text-sm active:scale-95 transition-all shadow-sm">{'\u2190'}</button>
          <h1 className="text-base font-extrabold text-gray-900 flex-1">Appointments</h1>
          <button onClick={() => nav('/appointments/history')} className="px-3 py-1.5 rounded-2xl bg-white/60 text-xs font-bold text-gray-500 active:scale-95 transition-all">History {'\u{1F4CB}'}</button>
        </div>
        <div className="px-5 pb-3 flex gap-2">
          <button onClick={() => setView('book')} className={'px-4 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 ' + (view === 'book' ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200' : 'bg-white/60 text-gray-400')}>Book New</button>
          <button onClick={() => setView('my')} className={'px-4 py-2 rounded-2xl text-xs font-bold transition-all active:scale-95 ' + (view === 'my' ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200' : 'bg-white/60 text-gray-400')}>
            My Bookings {bookings.filter(b => b.status === 'upcoming').length > 0 && <span className="ml-1 w-4 h-4 inline-flex items-center justify-center bg-white/30 rounded-full text-[8px]">{bookings.filter(b => b.status === 'upcoming').length}</span>}
          </button>
        </div>
      </div>

      <div className="px-5 pt-4 space-y-4">
        {view === 'book' && (<>
          {/* Step indicator */}
          <div className="flex gap-2">
            {['Doctor', 'Date & Time', 'Reason', 'Confirm'].map((s, i) => (
              <div key={s} className="flex-1">
                <div className={'h-1.5 rounded-full transition-all ' + (i <= step ? 'bg-gradient-to-r from-rose-500 to-pink-500' : 'bg-gray-200')} />
                <p className={'text-[8px] mt-1 font-bold ' + (i <= step ? 'text-rose-600' : 'text-gray-400')}>{s}</p>
              </div>
            ))}
          </div>

          {/* Step 0: Select Doctor */}
          {step === 0 && (<>
            <h3 className="text-sm font-extrabold text-gray-900">Choose a Doctor</h3>
            {chief && (
              <button onClick={() => { if (chief.isAvailable === false) { toast.error('This doctor is currently not accepting bookings'); return; } setSelDoc(chief.id); setStep(1); }}
                className={'w-full rounded-3xl p-4 text-left active:scale-[0.98] transition-transform border-2 shadow-lg ' + (chief.isAvailable === false ? 'opacity-60 border-gray-200 bg-gray-50' : selDoc === chief.id ? 'border-rose-400 bg-rose-50' : 'border-transparent bg-white')}>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-extrabold text-lg shadow-md">{chief.name.charAt(0)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-extrabold text-gray-800">{chief.name}</p>
                      <span className="text-[7px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">{'\u{1F451}'} CHIEF</span>
                      {chief.isAvailable === false && <span className="text-[7px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Unavailable</span>}
                    </div>
                    <p className="text-[10px] text-gray-500">{chief.specialization} • {chief.experience} yrs</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[10px] text-amber-500 font-bold">{'\u2605'} {chief.rating}</span>
                      <span className="text-[10px] text-emerald-600 font-bold">{'\u20B9'}{chief.fee}</span>
                      {chief.feeFreeForPoor && <span className="text-[8px] text-rose-500 font-bold">{'\u2764\uFE0F'} Free for needy</span>}
                    </div>
                  </div>
                </div>
              </button>
            )}
            {pubDoctors.filter(d => !d.isChief).map(d => (
              <button key={d.id} onClick={() => { if (d.isAvailable === false) { toast.error('This doctor is currently not accepting bookings'); return; } setSelDoc(d.id); setStep(1); }}
                className={'w-full rounded-2xl p-3 text-left active:scale-[0.98] transition-transform border-2 shadow-lg ' + (d.isAvailable === false ? 'opacity-60 border-gray-200 bg-gray-50' : selDoc === d.id ? 'border-rose-400 bg-rose-50' : 'border-transparent bg-white')}>
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-rose-400 to-pink-500 flex items-center justify-center text-white font-bold text-sm">{d.name.charAt(0)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-xs font-bold text-gray-800">{d.name}</p>
                      {d.isAvailable === false && <span className="text-[7px] font-bold bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">Unavailable</span>}
                    </div>
                    <p className="text-[10px] text-gray-500">{d.specialization} • {d.experience} yrs • {'\u20B9'}{d.fee}</p>
                  </div>
                </div>
              </button>
            ))}
          </>)}

          {/* Step 1: Date & Time */}
          {step === 1 && (<>
            <div className="flex items-center gap-2"><button onClick={() => setStep(0)} className="text-gray-400">{'\u2190'}</button><h3 className="text-sm font-extrabold">Select Date</h3></div>
            <div className="overflow-x-auto -mx-5 px-5">
              <div className="flex gap-2 min-w-max pb-2">
                {dates.map(d => (
                  <button key={d.full} onClick={() => setSelDate(d.full)}
                    className={'w-16 py-3 rounded-2xl text-center transition-all active:scale-95 flex-shrink-0 ' + (selDate === d.full ? 'bg-gradient-to-b from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200' : 'bg-white text-gray-600 border border-gray-100')}>
                    <p className="text-[9px] font-bold">{d.day}</p>
                    <p className="text-lg font-extrabold">{d.date}</p>
                    <p className="text-[9px]">{d.month}</p>
                  </button>
                ))}
              </div>
            </div>
            {selDate && (<>
              <h3 className="text-sm font-extrabold text-gray-900">Select Time</h3>
              {slotsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-8 h-8 border-3 border-rose-400 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : timeSlots.length === 0 ? (
                <div className="text-center py-8 bg-amber-50 rounded-2xl">
                  <p className="text-xs font-bold text-amber-700">No time slots available for this day</p>
                  <p className="text-[10px] text-amber-500 mt-1">Please try another date</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {timeSlots.map(t => (
                    <button key={t} onClick={() => { setSelTime(t); setStep(2); }}
                      className={'py-2.5 rounded-2xl text-xs font-bold transition-all active:scale-95 ' + (selTime === t ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md shadow-rose-200' : 'bg-white text-gray-600 border border-gray-100')}>
                      {t}
                    </button>
                  ))}
                </div>
              )}
              {doctorSlots.length > 0 && (
                <p className="text-[9px] text-gray-400 text-center mt-1">Showing doctor's available hours</p>
              )}
            </>)}
          </>)}

          {/* Step 2: Reason */}
          {step === 2 && (<>
            <div className="flex items-center gap-2"><button onClick={() => setStep(1)} className="text-gray-400">{'\u2190'}</button><h3 className="text-sm font-extrabold">Reason for Visit</h3></div>
            <div className="space-y-2">
              {reasons.map(r => (
                <button key={r} onClick={() => { setSelReason(r); setStep(3); }}
                  className={'w-full p-3 rounded-2xl text-left text-xs font-bold transition-all active:scale-[0.98] border-2 ' + (selReason === r ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-gray-100 bg-white text-gray-700')}>
                  {r}
                </button>
              ))}
            </div>
          </>)}

          {/* Step 3: Confirm */}
          {step === 3 && (<>
            <div className="flex items-center gap-2"><button onClick={() => setStep(2)} className="text-gray-400">{'\u2190'}</button><h3 className="text-sm font-extrabold">Confirm Booking</h3></div>
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
              <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                <div className={'w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold ' + (selectedDoctor?.isChief ? 'bg-gradient-to-br from-emerald-500 to-teal-600' : 'bg-gradient-to-br from-rose-400 to-pink-500')}>
                  {selectedDoctor?.name.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-extrabold text-gray-800">{selectedDoctor?.name}</p>
                  <p className="text-[10px] text-gray-500">{selectedDoctor?.specialization}</p>
                </div>
              </div>
              {[
                { l: 'Date', v: new Date(selDate).toLocaleDateString('en', { weekday: 'long', month: 'long', day: 'numeric' }), e: '\u{1F4C5}' },
                { l: 'Time', v: selTime, e: '\u{1F552}' },
                { l: 'Reason', v: selReason, e: '\u{1F4CB}' },
                { l: 'Fee', v: '\u20B9' + (selectedDoctor?.fee || 0), e: '\u{1F4B0}' },
              ].map(r => (
                <div key={r.l} className="flex items-center gap-3">
                  <span className="text-lg">{r.e}</span>
                  <div><p className="text-[10px] text-gray-400">{r.l}</p><p className="text-xs font-bold text-gray-800">{r.v}</p></div>
                </div>
              ))}
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase">Additional Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any specific concerns or questions..."
                  className="w-full mt-1 px-3 py-2 border border-gray-200 rounded-xl text-xs focus:border-emerald-400 focus:outline-none resize-none" rows={3} />
              </div>
            </div>
            {(selectedDoctor?.fee || 0) > 0 && (
              <div className="bg-emerald-50 rounded-2xl p-3 border border-emerald-100 flex items-center gap-2.5">
                <span className="text-lg">{'\uD83D\uDD12'}</span>
                <div>
                  <p className="text-[11px] font-bold text-emerald-800">Secure Payment via Razorpay</p>
                  <p className="text-[10px] text-emerald-600">You'll be redirected to pay {'\u20B9'}{selectedDoctor?.fee} before the appointment is confirmed.</p>
                </div>
              </div>
            )}
            <button onClick={handleConfirmBooking} disabled={paymentProcessing}
              className={'w-full py-3.5 rounded-2xl text-white font-bold text-sm transition-transform shadow-md shadow-rose-200 bg-gradient-to-r from-rose-500 to-pink-500 ' + (paymentProcessing ? 'opacity-70 cursor-not-allowed' : 'active:scale-95')}>
              {paymentProcessing ? 'Processing Payment...' : (selectedDoctor?.fee || 0) > 0 ? `Pay \u20B9${selectedDoctor?.fee} & Book` : 'Confirm Appointment \u2713'}
            </button>
          </>)}
        </>)}

        {/* MY BOOKINGS */}
        {view === 'my' && (<>
          {loading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-gray-100 rounded w-1/2" />
                      <div className="h-2 bg-gray-100 rounded w-1/3" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-16">
              <span className="text-5xl">{'\u{1F4C5}'}</span>
              <p className="text-sm font-bold text-gray-400 mt-3">No appointments yet</p>
              <button onClick={() => setView('book')} className="mt-3 text-xs font-bold text-emerald-600">Book your first {'\u2192'}</button>
            </div>
          ) : (
            bookings.map(b => (
              <div key={b.id} className={'bg-white rounded-3xl p-4 shadow-lg ' + (b.status === 'cancelled' ? 'opacity-60' : '')}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-sm">{b.doctorName.charAt(0)}</div>
                    <div>
                      <p className="text-xs font-bold text-gray-800">{b.doctorName}</p>
                      <p className="text-[10px] text-gray-500">{b.reason}</p>
                    </div>
                  </div>
                  <span className={'text-[8px] font-bold px-2 py-1 rounded-full ' + (b.status === 'upcoming' ? 'bg-emerald-100 text-emerald-700' : b.status === 'completed' ? 'bg-blue-100 text-blue-700' : b.status === 'rejected' ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-600')}>
                    {b.status.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-[10px] text-gray-500">
                  <span>{'\u{1F4C5}'} {new Date(b.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
                  <span>{'\u{1F552}'} {b.time}</span>
                </div>
                {/* Rejection reason */}
                {b.status === 'rejected' && b.rejectionReason && (
                  <div className="mt-2 bg-orange-50 rounded-xl px-3 py-2 border border-orange-100">
                    <p className="text-[9px] font-bold text-orange-600 uppercase mb-0.5">Reason for Rejection</p>
                    <p className="text-[11px] text-orange-800">{b.rejectionReason}</p>
                  </div>
                )}
                {b.status === 'upcoming' && (
                  <div className="mt-2 space-y-1.5">
                    {(b.videoLink || b.meetingLink) && (
                      <button onClick={() => window.open(b.videoLink || b.meetingLink, '_blank')} className="w-full py-2 rounded-xl bg-blue-50 text-blue-600 text-xs font-bold active:scale-95">{'\uD83C\uDFA5'} Join Video Call</button>
                    )}
                    <button onClick={() => cancelBooking(b.id)} className="w-full py-2 rounded-xl bg-red-50 text-red-600 text-xs font-bold active:scale-95">Cancel Appointment</button>
                  </div>
                )}
                {b.status === 'completed' && b.source === 'api' && (
                  <div className="mt-2">
                    <button onClick={() => viewPrescription(b.id)} className="w-full py-2 rounded-xl bg-emerald-50 text-emerald-700 text-xs font-bold active:scale-95 border border-emerald-100">
                      📋 View Prescription
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </>)}
      </div>

      {/* Prescription Modal */}
      {rxModal.open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setRxModal({ open: false, data: null, loading: false })}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-extrabold text-gray-900">📋 Prescription</h3>
              <button onClick={() => setRxModal({ open: false, data: null, loading: false })} className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 text-lg font-bold active:scale-95">×</button>
            </div>

            {rxModal.loading ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-400 font-medium">Loading prescription…</p>
              </div>
            ) : rxModal.data ? (
              <div className="space-y-4">
                {/* Doctor info */}
                {rxModal.data.appointment && (
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-2xl">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-base">
                      {(rxModal.data.appointment.doctor?.fullName || rxModal.data.appointment.doctorName || 'D').charAt(0)}
                    </div>
                    <div>
                      <p className="text-xs font-extrabold text-gray-800">{rxModal.data.appointment.doctor?.fullName || rxModal.data.appointment.doctorName}</p>
                      {rxModal.data.appointment.doctor?.specialization && (
                        <p className="text-[10px] text-gray-500">{rxModal.data.appointment.doctor.specialization}</p>
                      )}
                      {rxModal.data.appointment.scheduledAt && (
                        <p className="text-[10px] text-emerald-600 font-semibold">
                          {new Date(rxModal.data.appointment.scheduledAt).toLocaleDateString('en', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Diagnosis */}
                {rxModal.data.diagnosis && (
                  <div className="bg-rose-50 rounded-2xl p-3">
                    <p className="text-[10px] font-bold text-rose-600 uppercase mb-1">Diagnosis</p>
                    <p className="text-xs text-gray-800 font-medium">{rxModal.data.diagnosis}</p>
                  </div>
                )}

                {/* Medicines */}
                {rxModal.data.medicines && rxModal.data.medicines.length > 0 && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase mb-2">💊 Medicines</p>
                    <div className="space-y-2">
                      {rxModal.data.medicines.map((med: any, idx: number) => (
                        <div key={idx} className="bg-white border border-gray-100 rounded-2xl p-3 shadow-sm">
                          <p className="text-xs font-extrabold text-gray-800">{med.name}</p>
                          <div className="flex gap-3 mt-1 flex-wrap">
                            {med.dosage && <span className="text-[10px] text-gray-500">💊 {med.dosage}</span>}
                            {med.frequency && <span className="text-[10px] text-gray-500">🔁 {med.frequency}</span>}
                            {med.duration && <span className="text-[10px] text-gray-500">⏱ {med.duration}</span>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Instructions */}
                {rxModal.data.instructions && (
                  <div className="bg-blue-50 rounded-2xl p-3">
                    <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">📝 Instructions</p>
                    <p className="text-xs text-gray-700">{rxModal.data.instructions}</p>
                  </div>
                )}

                {/* Follow-up date */}
                {rxModal.data.followUpDate && (
                  <div className="flex items-center gap-2 bg-amber-50 rounded-2xl p-3">
                    <span className="text-lg">📅</span>
                    <div>
                      <p className="text-[10px] font-bold text-amber-700 uppercase">Follow-up</p>
                      <p className="text-xs font-bold text-gray-800">
                        {new Date(rxModal.data.followUpDate).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                )}

                <button onClick={() => setRxModal({ open: false, data: null, loading: false })} className="w-full py-3 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-500 active:scale-95 transition-transform shadow-md shadow-emerald-200 mt-2">
                  Done
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccess && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6" onClick={() => setShowSuccess(false)}>
          <div className="bg-white rounded-3xl p-6 text-center max-w-xs" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 flex items-center justify-center text-3xl mb-3">{'\u2705'}</div>
            <h3 className="text-lg font-extrabold text-gray-900">Booked!</h3>
            <p className="text-xs text-gray-500 mt-1">Your appointment has been confirmed. You'll receive a reminder before the visit.</p>
            {lastVideoLink && (
              <div className="mt-3 bg-blue-50 rounded-xl p-3 border border-blue-100">
                <p className="text-[10px] font-bold text-blue-700 uppercase mb-1">{'\uD83C\uDFA5'} Video Consultation Link</p>
                <p className="text-[10px] text-blue-600 break-all mb-2">{lastVideoLink}</p>
                <div className="flex gap-2">
                  <button onClick={() => { navigator.clipboard.writeText(lastVideoLink); toast.success('Link copied!'); }}
                    className="flex-1 py-2 rounded-xl bg-blue-100 text-blue-700 text-[10px] font-bold active:scale-95">
                    {'\uD83D\uDCCB'} Copy Link
                  </button>
                  <button onClick={() => window.open(lastVideoLink, '_blank')}
                    className="flex-1 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-bold active:scale-95">
                    {'\uD83C\uDFA5'} Join Call
                  </button>
                </div>
              </div>
            )}
            <button onClick={() => { setShowSuccess(false); setView('my'); }} className="w-full mt-4 py-3 rounded-2xl font-bold text-sm text-white active:scale-95 shadow-md shadow-rose-200 bg-gradient-to-r from-rose-500 to-pink-500">
              View My Bookings
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
