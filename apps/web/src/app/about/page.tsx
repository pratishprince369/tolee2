import React from 'react';

export default function AboutUs() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-8">About Tolee</h1>
      <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-600 dark:text-gray-400 font-sans">
        <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200">
          Welcome to <strong>Tolee</strong> — a community-first social networking platform designed to unite people around shared interests, neighborhoods, and common goals.
        </p>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">What is a Tolee?</h2>
          <p>
            The word <strong>Tolee</strong> originates from the Marathi language (टोळी), which translates to a group, crew, or gang. On our platform, a "Tolee" is a dedicated, niche interest community. Every post, discussion, event, or reel belongs to a specific Tolee, ensuring that content is always organized, contextual, and valuable.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Our Core Features</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>Niche Communities (Tolees):</strong> Join or create groups focused on local hobbies, sports, neighborhoods, business networks, or academic topics.
            </li>
            <li>
              <strong>Engaging Media Feed &amp; Reels:</strong> Share vertical video reels, high-quality images, polls, and articles to stay updated with your group members.
            </li>
            <li>
              <strong>Tolee World:</strong> Advanced creator monetization tools. Launch micro-websites, design e-commerce storefronts, manage local restaurants, and build rich blogs.
            </li>
            <li>
              <strong>Local Marketplace:</strong> Buy, sell, or trade goods and services with verified members within your local community.
            </li>
            <li>
              <strong>Ads &amp; Broadcasts:</strong> Leverage local broadcast tools like Tolee Shoot to run targeted ads, coupons, or promotion updates down to specific zip codes and target groups.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Our Vision</h2>
          <p>
            Our vision is to empower local creators, small businesses, and community leaders. We believe that social media should bring people closer to their real-world communities and provide tools that help local economies thrive.
          </p>
        </section>

        <section>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Get in Touch</h2>
          <p>
            Have ideas, feedback, or inquiries? We would love to hear from you. Reach out to our community management team at <a href="mailto:support@tolee.in" className="text-pink-500 hover:underline">support@tolee.in</a>.
          </p>
        </section>
      </div>
    </div>
  );
}
