"use client";

import { FaFacebook, FaInstagram, FaTwitter, FaYoutube } from "react-icons/fa";

export default function Footer() {
  const sections = [
    {
      title: "Company Info",
      links: [
        "About Us",
        "Contact Us",
        "Careers",
        "FAQs",
        "Terms of Service",
        "Privacy Policy",
      ],
    },
    {
      title: "Help",
      links: [
        "Account Support",
        "Listing Events",
        "Event Ticketing",
        "Ticket Purchase Terms & Conditions",
      ],
    },
    {
      title: "Categories",
      links: [
        "Concerts & Gigs",
        "Festivals & Lifestyle",
        "Business & Networking",
        "Food & Drinks",
        "Performing Arts",
        "Sports & Outdoors",
        "Exhibitions",
        "Workshops, Conferences & Classes",
      ],
    },
    {
      title: "Follow Us",
      links: ["Facebook", "Instagram", "Twitter", "Youtube"],
      icons: [
        <FaFacebook key="fb" />,
        <FaInstagram key="ig" />,
        <FaTwitter key="tw" />,
        <FaYoutube key="yt" />,
      ],
    },
  ];

  return (
    <footer className="bg-[#2C293C] text-white py-12 px-6 md:px-20">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
        {sections.slice(0, 4).map((section, index) => (
          <div key={index}>
            <h3 className="font-semibold text-lg mb-4">{section.title}</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              {section.links.map((link, i) => (
                <li key={i} className="flex items-center gap-2">
                  {section.icons && section.icons[i]}
                  <div className=" cursor-pointer">{link}</div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-gray-600 mt-12 pt-4 text-center text-sm text-gray-400">
        © 2025 VieTicket. All rights reserved.
      </div>
    </footer>
  );
}
