# إعداد مساعد المعيد

## التشغيل والتثبيت

استخدم Node.js ‏22.12 أو أحدث.

```sh
npm install
npm run dev
```

للتحقق من التثبيت والعمل دون اتصال، شغّل `npm run build` ثم `npm run preview`. افتح التطبيق مرة أثناء الاتصال لتخزين ملفات نسخة الإنتاج. على أندرويد اختر تثبيت التطبيق من قائمة Chrome. على iPhone افتح الموقع في Safari ثم اختر **مشاركة ← إضافة إلى الشاشة الرئيسية**. يحتاج الموقع المنشور إلى HTTPS.

## قفل الجهاز والنسخ الاحتياطي

من **الإعدادات** يمكنك تفعيل رمز PIN للمستعرض الحالي وتصدير بيانات مساحة العمل إلى ملف JSON. استعادة النسخة تستبدل بيانات مساحة العمل المفتوحة بعد التأكيد. احتفظ بالملف في مكان خاص لأنه يحتوي على بيانات الطلاب.

يقفل PIN واجهة التطبيق على هذا الجهاز. تبقى البيانات المخزنة والنسخ الاحتياطية قابلة للقراءة من أدوات المتصفح أو من الملف. عند تفعيل المزامنة، تُحصر صلاحية الوصول إلى مساحة Firestore بحساب المعيد وقواعد الوصول أدناه.

## تفعيل Firebase

1. أنشئ مشروعًا في Firebase Console، وسجّل تطبيق **Web** وفعّل **Cloud Firestore** وقاعدة البيانات الافتراضية. في **Authentication → Sign-in method** فعّل Google.
2. انسخ `.env.example` إلى `.env.local`. من إعدادات تطبيق Web، املأ `VITE_FIREBASE_API_KEY` و`VITE_FIREBASE_AUTH_DOMAIN` و`VITE_FIREBASE_PROJECT_ID` و`VITE_FIREBASE_APP_ID`. الحقلان الآخران اختياريان. هذه قيم إعدادات تطبيق الويب العامة. احتفظ بمفاتيح حسابات الخدمة خارج التطبيق.
3. انشر قواعد Firestore التالية. أضف نطاق النشر إلى **Authentication → Settings → Authorized domains**، وأضف `localhost` عند الاختبار محليًا إذا احتجت إليه.
4. أعد تشغيل Vite أو أعد النشر. سجّل الدخول بحساب Google نفسه على أجهزتك للوصول إلى مساحة العمل نفسها. يتطلب فتح مساحة جديدة أول مرة اتصالًا. بعد ذلك يستطيع Firestore قراءة النسخة المخزنة محليًا وإرسال التعديلات عند عودة الاتصال.

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/workspace/{part} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
  }
}
```

عند غياب أي قيمة لازمة يعمل التطبيق مباشرة بالتخزين المحلي. تبقى بيانات المتصفح ومساحة Firebase منفصلتين، ويمكن الرجوع إلى بيانات المتصفح باختيار **التخزين المحلي**. يزامن التطبيق مساحة العمل كاملة حتى ٥ MiB. عند تعديل المساحة نفسها على جهازين دون اتصال، تسود آخر نسخة تصل إلى الخادم.

## ربط Google Forms بـ Firestore

يستورد التطبيق ملفات CSV وExcel مباشرة من شاشة التقييم. ولحفظ الردود الجديدة فور وصولها في Firestore، استخدم [قالب Apps Script](docs/google-apps-script-webhook.js):

1. من النموذج، افتح **Apps Script** والصق القالب في مشروع مرتبط بالنموذج. اربط مشروع السكربت بمشروع Google Cloud قياسي، وفعّل فيه Firestore API. امنح حساب Google الذي سيُثبّت المشغّل صلاحية **Cloud Datastore User** في مشروع Firebase المقصود.
2. في **Project Settings → Script properties** أضف `FIREBASE_PROJECT_ID` و`TASK_ID` (المعرّف في نهاية رابط التقييم). إذا اختلفت عناوين الأسئلة عن «الاسم» و«الكود»، أضف `STUDENT_NAME_QUESTION` و`STUDENT_ID_QUESTION` بالعناوين المستخدمة.
3. أظهر ملف بيان المشروع `appsscript.json` من الإعدادات، ثم أضف النطاقات التالية إلى حقل `oauthScopes` مع الإبقاء على بقية خصائصه:

```json
{
  "oauthScopes": [
    "https://www.googleapis.com/auth/forms.currentonly",
    "https://www.googleapis.com/auth/script.scriptapp",
    "https://www.googleapis.com/auth/script.external_request",
    "https://www.googleapis.com/auth/datastore"
  ]
}
```

4. شغّل `installFormSubmitTrigger` مرة واحدة ووافق على الأذونات. أرسل ردًا تجريبيًا وتحقّق من ظهوره في مجموعة `formSubmissions`. هذه المجموعة صندوق وارد في Firestore. لتحديث حالات التسليم داخل التطبيق، استورد ملف الردود من شاشة التقييم.

## النشر المجاني على Vercel

1. اربط مستودع GitHub في **Vercel → Add New → Project** واختر خطة **Hobby** إذا كان استخدامك مؤهلًا لها.
2. اختر **Vite**. أمر البناء `npm run build` ومجلد الناتج `dist`. تُدار التنقلات عبر روابط Hash، ويمكن فتحها مباشرة دون إعداد تحويل مسارات.
3. أضف متغيرات Firebase في **Settings → Environment Variables** إذا أردت تفعيل المزامنة، ثم اضغط **Deploy**. أضف نطاق `vercel.app` النهائي إلى نطاقات Firebase المسموح بها عند استخدام تسجيل الدخول.
