// API bridge: connects the frontend flow to the Express/Postgres backend.
// IMPORTANT: vms_fixed.html calls these functions (submitReg/sendNotif/activateVisit/doCheckout)
// IMPORTANT: UI markup/layout is NOT changed.

(function initBridge(){
  const BASE = 'http://localhost:3001/api';

  function getJSON(res){
    return res.json().catch(() => ({}));
  }

  async function request(path, { method='GET', body=null } = {}){
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await getJSON(res);
    if(!res.ok || (data && data.ok === false)){
      const msg = data && data.error ? data.error : `Request failed (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  // Hosts/RFID/Appointment (optional helpers)
  window.apiListHosts = async function(){
    return (await request('/hosts')).data || [];
  };

  window.apiLookupAppointment = async function(code){
    return await request(`/appointments/lookup?code=${encodeURIComponent(code)}`);
  };

  window.apiListRfidAvailable = async function(){
    const res = await request('/rfid/available');
    if (!res || !res.data || !Array.isArray(res.data.cards)) {
      throw new Error('Failed to load RFID cards: unexpected response format');
    }
    return res.data.cards;
  };

  // GET /api/visits/by-phone?phone=… — real DB-backed returning-visitor lookup
  window.apiFetchVisitorByPhone = async function(phone, countryCode){
    const res = await request(`/visits/by-phone?phone=${encodeURIComponent(phone)}&country_code=${encodeURIComponent(countryCode || 'IN')}`);
    console.log('[apiFetchVisitorByPhone] request URL', `/visits/by-phone?phone=${encodeURIComponent(phone)}&country_code=${encodeURIComponent(countryCode || 'IN')}`);
    console.log('[apiFetchVisitorByPhone] response', res);
    const visitor = res && res.data ? res.data.visitor : null;
    console.log('[apiFetchVisitorByPhone] visitor', visitor);
    if (visitor && visitor.id_number) {
      // Update the global state and UI for ID number
      S.v.idNumber = visitor.id_number; // store raw ID
      const idInput = document.getElementById('fidnum');
      if (idInput) {
        console.log('[apiFetchVisitorByPhone] setting fidnum', visitor.id_number);
        idInput.value = visitor.id_number;
        // Trigger input handling to apply formatting/masking as needed
        if (typeof onIdInput === 'function') onIdInput(idInput);
        // Dispatch native input event to ensure any listeners react
        idInput.dispatchEvent(new Event('input'));
      }
    }
    return visitor;
  };

  // Explicit helper: fetch full returning-visitor detail by phone.
  // Returns the same shape as /by-phone but named to signal "full detail" intent in UI code.
  window.fetchReturningVisitorDetail = async function(phone, countryCode){
    const res = await request(`/visits/by-phone?phone=${encodeURIComponent(phone)}&country_code=${encodeURIComponent(countryCode || 'IN')}`);
    return res && res.data ? res.data.visitor : null;
  };

  // Visits lifecycle
  window.apiCreateVisit = async function(payload){
    // payload must match backend/routes/visits.js POST /api/visits
    return await request('/visits', { method:'POST', body: payload });
  };

  window.apiSignAgreement = async function(visitId, signed=true){
    return await request(`/visits/${visitId}/agreement`, { method:'PATCH', body:{ signed: !!signed } });
  };

  window.apiNotifyHost = async function(visitId){
    return await request(`/visits/${visitId}/notify`, { method:'POST', body:{} });
  };

  window.apiActivateVisit = async function(visitId, rfid_tag){
    return await request(`/visits/${visitId}/activate`, { method:'POST', body:{ rfid_tag } });
  };

  window.apiCheckoutVisit = async function(visitId){
    return await request(`/visits/${visitId}/checkout`, { method:'POST', body:{ rfid_confirmed:true } });
  };

  // --- OVERRIDES FOR vms_fixed.html ---
  window.sendApprovalRequest = async function() {
    try {
      const payload = {
        name: S.v.name,
        company: S.v.company,
        email: S.v.email,
        phone: S.v.phone,
        countryCode: S.v.countryCode,
        purpose: S.v.purpose,
        host_id: S.v.hostId,
        id_type: S.v.idType,
        id_number: S.v.idType === 'Aadhaar Card' ? (S.v.idNumberRaw || '').replace(/\s/g, '') : S.v.idNumber,
        visitor_type: S.v.visitorType,
        team_name: S.v.teamName,
        team_count: S.v.teamCount,
        team_members: S.v.teamMembers,
        photo_b64: S.photo || ''
      };

      const createRes = await window.apiCreateVisit(payload);
      S.dbVisitId = createRes.data.id;

      // Also save/overwrite the photo deterministically (idempotent PATCH)
      if (S.photo) {
        try { await request(`/visits/${S.dbVisitId}/photo`, { method: 'PATCH', body: { photo_b64: S.photo } }); } catch(_e) { /* non-blocking */ }
      }

      await window.apiNotifyHost(S.dbVisitId);

      console.log('[Approval] Sent via backend API.');
      S.approvalSent = true;
    } catch (err) {
      console.error('[Integration Error]', err);
      if (typeof toast === 'function') toast('Failed to send approval request: ' + err.message, 'err');
    }
  };

  window.startApprovalPolling = function() {
    if (S.poller) clearInterval(S.poller);
    
    const poll = async () => {
      try {
        if (!S.dbVisitId) return;
        const res = await request(`/visits/${S.dbVisitId}/status`);
        const status = res.data?.approval_status;
        
        if (status === 'approved') {
          if (S.poller) clearInterval(S.poller);
          S.approved = true;
          if (typeof goStep === 'function') goStep(6);
          if (typeof setStatus === 'function') setStatus('Access approved! Please assign a physical RFID card.', 'ok'); 
          setTimeout(() => { if (typeof hideStatus === 'function') hideStatus(); }, 4500);
        } else if (status === 'denied') {
          if (S.poller) clearInterval(S.poller);
          S.approved = false;
          if (typeof goStep === 'function') goStep(6);
          if (typeof setStatus === 'function') setStatus('Access denied. Visit logged.', 'err');
        }
      } catch (err) {
        console.error('[Poll Error]', err);
      }
    };
    
    S.poller = setInterval(poll, 3000);
  };

  window.activateVisit = async function() {
    if (!S.rfid) { toast('Please select an RFID card slot first.', 'err'); return; }
    if (!S.dbVisitId) { toast('Database ID missing. Cannot activate.', 'err'); return; }

    try {
      await window.apiActivateVisit(S.dbVisitId, S.rfid);

      // Save photo to DB if not done already (covers demo-shortcut path)
      if (S.photo) {
        try { await request(`/visits/${S.dbVisitId}/photo`, { method:'PATCH', body:{ photo_b64: S.photo }}); } catch(_e) { /* non-blocking */ }
      }

      const ok = Store.assignTag(S.rfid, S.v.name);
      if (!ok) { toast('That card is already assigned locally.', 'err'); S.rfid = null; renderPanel(); return; }

      S.inTime = Date.now();
      const h = gh(S.v.hostId);
      Store.addSession({
        id: S.sessionId,
        dbVisitId: S.dbVisitId,
        name: S.v.name, company: S.v.company,
        email: S.v.email, host: h ? h.name : '—', purpose: S.v.purpose,
        idType: S.v.idType, idNumber: S.v.idNumber, rfid: S.rfid,
        inTime: S.inTime, status: 'active', hadAppointment: S.apptFound || false,
        visitorType: S.v.visitorType, teamName: S.v.teamName,
        teamCount: S.v.teamCount, teamMembers: S.v.teamMembers?.slice() || [],
      });
      if (typeof saveToHistory === 'function') saveToHistory(S.v);
      if (typeof renderHamBody === 'function') renderHamBody();
      if (typeof goStep === 'function') goStep(7);
      if (typeof setStatus === 'function') setStatus(`RFID ${S.rfid} activated. Visit in progress.`, 'ok');
      setTimeout(() => { if (typeof hideStatus === 'function') hideStatus(); }, 4000);
    } catch (err) {
      if (typeof toast === 'function') toast('Failed to activate visit: ' + err.message, 'err');
    }
  };

  window.doCheckout = async function() {
    const cb = document.getElementById('tagRet');
    if (!cb || !cb.checked) { if (typeof toast === 'function') toast('Confirm RFID card returned before checkout.', 'err'); return; }
    if (!S.dbVisitId) { if (typeof toast === 'function') toast('Database ID missing. Cannot checkout.', 'err'); return; }
    
    try {
      await window.apiCheckoutVisit(S.dbVisitId);
      
      S.outTime = Date.now();
      Store.checkoutSession(S.sessionId);
      if (typeof renderHamBody === 'function') renderHamBody();
      if (typeof goStep === 'function') goStep(9);
      if (typeof setStatus === 'function') setStatus('Checkout complete. Record saved.', 'ok');
      setTimeout(() => { if (typeof hideStatus === 'function') hideStatus(); }, 4000);
    } catch (err) {
      if (typeof toast === 'function') toast('Failed to checkout: ' + err.message, 'err');
    }
  };

  window.hamCheckout = async function(id) {
    if (!confirm('Checkout this visitor?')) return;
    try {
      const sess = Store.findSession(id);
      if (sess && sess.dbVisitId) {
        await window.apiCheckoutVisit(sess.dbVisitId);
      } else if (S.sessionId === id && S.dbVisitId) {
        await window.apiCheckoutVisit(S.dbVisitId);
      }
      
      Store.checkoutSession(id);
      if (typeof renderHamBody === 'function') renderHamBody();
      if (S.sessionId === id) {
        S.outTime = Date.now();
        if (S.step === 7 || S.step === 8) goStep(9);
      }
      if (typeof toast === 'function') toast('Visitor checked out.', 'ok');
    } catch (err) {
      if (typeof toast === 'function') toast('Failed to checkout on server: ' + err.message, 'err');
    }
  };

  console.log('[Bridge] api-bridge loaded with UI overrides:', BASE);
})();
