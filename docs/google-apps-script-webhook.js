// اربط السكربت بنموذج Google واضبط خصائص المشروع الموضّحة في دليل الإعداد.
function installFormSubmitTrigger() {
  const form = FormApp.getActiveForm();
  if (!form) throw new Error('افتح السكربت من داخل النموذج.');
  const installed = ScriptApp.getProjectTriggers().some(
    (trigger) => trigger.getHandlerFunction() === 'pushSubmissionToFirestore'
      && trigger.getTriggerSourceId() === form.getId()
  );
  if (!installed) {
    ScriptApp.newTrigger('pushSubmissionToFirestore').forForm(form).onFormSubmit().create();
  }
}

// يعمل بالمُشغّل المثبّت بهوية مالك المشغّل، من دون مفتاح حساب خدمة.
function pushSubmissionToFirestore(event) {
  if (!event || !event.response) throw new Error('شغّل الدالة من حدث إرسال النموذج.');
  const properties = PropertiesService.getScriptProperties();
  const projectId = properties.getProperty('FIREBASE_PROJECT_ID');
  const taskId = properties.getProperty('TASK_ID');
  const nameQuestion = properties.getProperty('STUDENT_NAME_QUESTION') || 'الاسم';
  const codeQuestion = properties.getProperty('STUDENT_ID_QUESTION') || 'الكود';
  if (!projectId || !taskId) throw new Error('اضبط FIREBASE_PROJECT_ID وTASK_ID.');

  const response = event.response;
  const responses = new Map(response.getItemResponses().map((item) => [
    item.getItem().getTitle().trim(), String(item.getResponse()).trim(),
  ]));
  const formId = event.source.getId();
  const responseId = response.getId();
  // معرّف ثابت يمنع تكرار المستند عند إعادة إرسال الحدث نفسه.
  const documentId = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, formId + ':' + responseId)
    .map((byte) => ((byte + 256) % 256).toString(16).padStart(2, '0')).join('');
  const url = 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(projectId)
    + '/databases/(default)/documents/formSubmissions/' + documentId;
  const result = UrlFetchApp.fetch(url, {
    method: 'patch',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() },
    payload: JSON.stringify({ fields: {
      formId: { stringValue: formId },
      responseId: { stringValue: responseId },
      taskId: { stringValue: taskId },
      studentName: { stringValue: responses.get(nameQuestion) || '' },
      studentCode: { stringValue: responses.get(codeQuestion) || '' },
      submittedAt: { timestampValue: response.getTimestamp().toISOString() },
    } }),
    muteHttpExceptions: true,
  });
  if (result.getResponseCode() >= 300) {
    throw new Error('تعذّر حفظ الرد في Firestore. رمز HTTP: ' + result.getResponseCode());
  }
}
