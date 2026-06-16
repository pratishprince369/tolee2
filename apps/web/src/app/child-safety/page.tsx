import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Child Safety Policy | Tolee",
  description: "Tolee's Child Safety Standards and policies against Child Sexual Abuse and Exploitation (CSAE).",
};

export default function ChildSafetyPage() {
  return (
    <main className="min-h-screen bg-white text-gray-800 px-6 py-12 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-2 text-gray-900">Child Safety Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: June 2026</p>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Our Commitment</h2>
        <p className="text-gray-600 leading-relaxed">
          Tolee is committed to creating a safe online environment for all users, especially children.
          We have a zero-tolerance policy for Child Sexual Abuse and Exploitation (CSAE) content.
          Any content, behavior, or account that violates this policy will be immediately removed,
          and the relevant authorities will be notified.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Prohibited Content</h2>
        <p className="text-gray-600 leading-relaxed mb-3">The following content is strictly prohibited on Tolee:</p>
        <ul className="list-disc list-inside text-gray-600 space-y-2">
          <li>Any content that sexually exploits minors (persons under 18 years of age).</li>
          <li>Child Sexual Abuse Material (CSAM) of any kind.</li>
          <li>Content that grooms, exploits, or endangers children.</li>
          <li>Any content that facilitates trafficking of children.</li>
          <li>Solicitation of minors for sexual purposes.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Reporting Mechanisms</h2>
        <p className="text-gray-600 leading-relaxed">
          Tolee provides in-app reporting tools that allow any user to report content or behavior
          that may exploit or endanger children. All reports are reviewed promptly. Users can report
          any post, profile, or message directly within the app using the &quot;Report&quot; option
          available on all content.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Enforcement Actions</h2>
        <p className="text-gray-600 leading-relaxed">
          Upon detection or report of CSAE-related content, Tolee will take the following actions:
        </p>
        <ul className="list-disc list-inside text-gray-600 space-y-2 mt-3">
          <li>Immediately remove the reported content.</li>
          <li>Suspend or permanently ban the offending account.</li>
          <li>Report the incident to the National Center for Missing and Exploited Children (NCMEC) and relevant local authorities as required by law.</li>
          <li>Cooperate fully with law enforcement investigations.</li>
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Age Requirements</h2>
        <p className="text-gray-600 leading-relaxed">
          Tolee requires all users to be at least 13 years of age to create an account. We encourage
          parents and guardians to supervise their children&apos;s online activities. If we become aware
          that a user is under 13, their account will be immediately removed.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Compliance</h2>
        <p className="text-gray-600 leading-relaxed">
          Tolee complies with all applicable child safety laws, including but not limited to the
          Children&apos;s Online Privacy Protection Act (COPPA) and reports to regional and national
          authorities as required. We continuously review and update our safety practices to meet
          or exceed industry standards.
        </p>
      </section>

      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3 text-gray-800">Contact Us</h2>
        <p className="text-gray-600 leading-relaxed">
          If you have any concerns about child safety on Tolee, or wish to report a violation,
          please contact us at:
        </p>
        <p className="mt-3 font-medium text-gray-800">
          📧{" "}
          <a href="mailto:pratishrupawate369@gmail.com" className="text-blue-600 underline">
            pratishrupawate369@gmail.com
          </a>
        </p>
      </section>

      <hr className="my-8 border-gray-200" />
      <p className="text-xs text-gray-400 text-center">
        © 2026 Tolee. All rights reserved.
      </p>
    </main>
  );
}
