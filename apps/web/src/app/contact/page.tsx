"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";

// UI Components
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Icons
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  Headphones,
  Users,
  Building,
  Globe,
} from "lucide-react";

export default function ContactPage() {
  const t = useTranslations("contact");
  const glowRef = useRef<HTMLDivElement>(null);

  // Mouse tracking for glow effect
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (glowRef.current) {
        const { clientX, clientY } = e;
        glowRef.current.style.left = `${clientX}px`;
        glowRef.current.style.top = `${clientY}px`;
        glowRef.current.style.opacity = '1';
      }
    };

    const handleMouseLeave = () => {
      if (glowRef.current) {
        glowRef.current.style.opacity = '0';
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  const contactInfo = [
    {
      icon: Phone,
      title: t("contactInfo.phone.title"),
      details: [t("contactInfo.phone.details.0")],
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      icon: Mail,
      title: t("contactInfo.email.title"),
      details: [
        t("contactInfo.email.details.0"),
        t("contactInfo.email.details.1"),
      ],
      color: "text-[#2A273F]",
      bgColor: "bg-yellow-50",
    },
    {
      icon: MapPin,
      title: t("contactInfo.address.title"),
      details: [t("contactInfo.address.details.0")],
      color: "text-red-500",
      bgColor: "bg-red-50",
    },
    {
      icon: Clock,
      title: t("contactInfo.hours.title"),
      details: [
        t("contactInfo.hours.details.0"),
        t("contactInfo.hours.details.1"),
      ],
      color: "text-[#3A3555]",
      bgColor: "bg-blue-50",
    },
  ];

  const supportCategories = [
    {
      icon: Headphones,
      title: t("support.categories.customer.title"),
      description: t("support.categories.customer.description"),
      response: t("support.categories.customer.response"),
    },
    {
      icon: Building,
      title: t("support.categories.business.title"),
      description: t("support.categories.business.description"),
      response: t("support.categories.business.response"),
    },
    {
      icon: Users,
      title: t("support.categories.partnership.title"),
      description: t("support.categories.partnership.description"),
      response: t("support.categories.partnership.response"),
    },
    {
      icon: Globe,
      title: t("support.categories.media.title"),
      description: t("support.categories.media.description"),
      response: t("support.categories.media.response"),
    },
  ];

  const faqItems = [
    {
      question: t("faq.items.booking.question"),
      answer: t("faq.items.booking.answer"),
    },
    {
      question: t("faq.items.cancellation.question"),
      answer: t("faq.items.cancellation.answer"),
    },
    {
      question: t("faq.items.eticket.question"),
      answer: t("faq.items.eticket.answer"),
    },
  ];

  return (
    <>
      <div className="min-h-screen bg-slate-950 relative overflow-hidden">
        {/* Background Effects */}
        <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-900/20 via-slate-950 to-slate-950 pointer-events-none" />
        <div className="fixed inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 glow-text bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            {t("hero.title")}
          </h1>
          <p className="text-xl text-slate-300 max-w-3xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="relative py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <div key={index} className="professional-card text-center group hover:border-violet-400/30 transition-all duration-300 hover:-translate-y-1">
                  <div className="p-6">
                    <div className="inline-flex p-4 rounded-full bg-violet-500/10 mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-6 h-6 text-violet-400" />
                    </div>
                    <h3 className="font-semibold text-white mb-3">{info.title}</h3>
                    <div className="space-y-1">
                      {info.details.map((detail, i) => (
                        <p key={i} className="text-sm text-slate-300">{detail}</p>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

        {/* Support Categories */}
        <section className="relative py-10 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold glow-text bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mb-4">
                {t("support.title")}
              </h2>
              <p className="text-lg text-slate-300 max-w-2xl mx-auto">
                {t("support.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {supportCategories.map((category, index) => {
                const Icon = category.icon;
                return (
                  <div key={index} className="professional-card group hover:border-violet-400/30 transition-all duration-300">
                    <div className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-lg bg-gradient-to-br from-violet-500/20 to-indigo-500/20 group-hover:from-violet-500/30 group-hover:to-indigo-500/30 transition-colors">
                          <Icon className="w-6 h-6 text-violet-400" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-2">{category.title}</h3>
                          <p className="text-slate-300 text-sm mb-3">{category.description}</p>
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-green-400" />
                            <span className="text-sm text-slate-400">{category.response}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="relative py-10 px-6">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold glow-text bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mb-4">
                {t("faq.title")}
              </h2>
              <p className="text-lg text-slate-300">
                {t("faq.subtitle")}
              </p>
            </div>

            <div className="space-y-4">
              {faqItems.map((item, index) => (
                <div key={index} className="professional-card group hover:border-violet-400/30 transition-all duration-300">
                  <div className="p-6">
                    <div className="flex items-start gap-3 text-lg font-semibold text-white mb-4">
                      <MessageSquare className="w-5 h-5 text-violet-400 mt-1 flex-shrink-0" />
                      {item.question}
                    </div>
                    <div className="ml-8 text-slate-300 leading-relaxed">
                      {item.answer}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center mt-12">
              <p className="text-slate-300 mb-4">
                {t("faq.notFound")}
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a 
                  href="tel:0766567846"
                  className="professional-button bg-gradient-to-r from-violet-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-violet-700 hover:to-indigo-700 transition-all transform hover:scale-105 flex items-center gap-2 justify-center"
                >
                  <Phone className="w-4 h-4" />
                  {t("faq.callNow")}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Map Section */}
        <section className="relative py-10 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold glow-text bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent mb-4">
                {t("office.title")}
              </h2>
            </div>

            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-6">
                  {t("office.headquarters")}
                </h3>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-red-400 mt-1" />
                    <div>
                      <p className="font-medium text-white">{t("office.details.address.title")}</p>
                      <p className="text-slate-300">{t("office.details.address.line1")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Clock className="w-5 h-5 text-blue-400 mt-1" />
                    <div>
                      <p className="font-medium text-white">{t("office.details.hours.title")}</p>
                      <p className="text-slate-300">{t("office.details.hours.weekdays")}</p>
                      <p className="text-slate-300">{t("office.details.hours.saturday")}</p>
                      <p className="text-slate-300">{t("office.details.hours.sunday")}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Phone className="w-5 h-5 text-green-400 mt-1" />
                    <div>
                      <p className="font-medium text-white">{t("office.details.phone.title")}</p>
                      <p className="text-slate-300">{t("office.details.phone.hotline")}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="professional-card rounded-xl h-80 overflow-hidden">
                <iframe
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3833.9896394567!2d108.21563287590832!3d16.070644484620842!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x314219d37cf8e3c3%3A0x6c20ec86c5c48d58!2zMTAgQ-G6qW0gQuG6r2MgMywgSGFpIENow6J1LCDEkMOgIE7hurVuZyA1NTAwMDAsIFZp4buHdCBOYW0!5e0!3m2!1svi!2s!4v1732875500000!5m2!1svi!2s"
                  width="100%"
                  height="100%"
                  style={{ border: 0 }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  title="Office Location"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}