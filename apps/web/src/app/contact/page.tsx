"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Phone, 
  Mail, 
  MapPin, 
  Clock,
  MessageSquare,
  Send,
  CheckCircle,
  AlertCircle,
  Headphones,
  Users,
  Building,
  Globe
} from "lucide-react";

export default function ContactPage() {
  const t = useTranslations("contact");

  const contactInfo = [
    {
      icon: Phone,
      title: t("contactInfo.phone.title"),
      details: [t("contactInfo.phone.details.0")],
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: Mail,
      title: t("contactInfo.email.title"),
      details: [t("contactInfo.email.details.0"), t("contactInfo.email.details.1")],
      color: "text-[#2A273F]", 
      bgColor: "bg-yellow-50"
    },
    {
      icon: MapPin,
      title: t("contactInfo.address.title"),
      details: [t("contactInfo.address.details.0")],
      color: "text-red-500",
      bgColor: "bg-red-50"
    },
    {
      icon: Clock,
      title: t("contactInfo.hours.title"),
      details: [t("contactInfo.hours.details.0"), t("contactInfo.hours.details.1")],
      color: "text-[#3A3555]",
      bgColor: "bg-blue-50"
    }
  ];

  const supportCategories = [
    {
      icon: Headphones,
      title: t("support.categories.customer.title"),
      description: t("support.categories.customer.description"),
      response: t("support.categories.customer.response")
    },
    {
      icon: Building,
      title: t("support.categories.business.title"),
      description: t("support.categories.business.description"),
      response: t("support.categories.business.response")
    },
    {
      icon: Users,
      title: t("support.categories.partnership.title"),
      description: t("support.categories.partnership.description"),
      response: t("support.categories.partnership.response")
    },
    {
      icon: Globe,
      title: t("support.categories.media.title"),
      description: t("support.categories.media.description"),
      response: t("support.categories.media.response")
    }
  ];

  const faqItems = [
    {
      question: t("faq.items.booking.question"),
      answer: t("faq.items.booking.answer")
    },
    {
      question: t("faq.items.cancellation.question"),
      answer: t("faq.items.cancellation.answer")
    },
    {
      question: t("faq.items.eticket.question"),
      answer: t("faq.items.eticket.answer")
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50/30 via-gray-50 to-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-[#2A273F] via-[#3A3555] to-[#2A273F] text-white py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
            {t("hero.title")}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>
        </div>
      </section>

      {/* Contact Info */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info, index) => {
              const Icon = info.icon;
              return (
                <Card key={index} className="text-center group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className={`inline-flex p-4 rounded-full ${info.bgColor} mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className={`w-6 h-6 ${info.color}`} />
                    </div>
                    <h3 className="font-semibold text-gray-900 mb-3">{info.title}</h3>
                    <div className="space-y-1">
                      {info.details.map((detail, i) => (
                        <p key={i} className="text-sm text-gray-600">{detail}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Support Categories */}
      <section className="py-10 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t("support.title")}
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              {t("support.subtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {supportCategories.map((category, index) => {
              const Icon = category.icon;
              return (
                <Card key={index} className="group hover:shadow-lg transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div className="p-3 rounded-lg bg-gradient-to-br from-yellow-100 to-orange-100 group-hover:from-yellow-200 group-hover:to-orange-200 transition-colors">
                        <Icon className="w-6 h-6 text-orange-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 mb-2">{category.title}</h3>
                        <p className="text-gray-600 text-sm mb-3">{category.description}</p>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-gray-500">{category.response}</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-10 px-6 bg-gradient-to-br from-yellow-50/50 to-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-[#2A273F] mb-4">
              {t("faq.title")}
            </h2>
            <p className="text-lg text-gray-600">
              {t("faq.subtitle")}
            </p>
          </div>

          <div className="space-y-4">
            {faqItems.map((item, index) => (
              <Card key={index} className="group hover:shadow-md transition-all duration-300 border-yellow-100 hover:border-yellow-200">
                <CardHeader>
                  <CardTitle className="flex items-start gap-3 text-lg">
                    <MessageSquare className="w-5 h-5 text-[#2A273F] mt-1 flex-shrink-0" />
                    {item.question}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="ml-8 text-gray-600 leading-relaxed">
                    {item.answer}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12">
            <p className="text-gray-600 mb-4">
              Không tìm thấy câu trả lời? Hãy liên hệ trực tiếp với chúng tôi
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="tel:19001234"
                className="bg-[#2A273F] text-white px-6 py-3 rounded-lg font-semibold hover:bg-[#3A3555] transition-colors flex items-center gap-2 justify-center"
              >
                <Phone className="w-4 h-4" />
                Gọi ngay: 0766 567 846
              </a>
              <a 
                href="mailto:support@vieticket.com"
                className="border-2 border-[#2A273F] text-[#2A273F] px-6 py-3 rounded-lg font-semibold hover:bg-[#2A273F] hover:text-white transition-colors flex items-center gap-2 justify-center"
              >
                <Mail className="w-4 h-4" />
                Email hỗ trợ
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Map Section */}
      <section className="py-10 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t("office.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900 mb-6">
                {t("office.headquarters")}
              </h3>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-red-500 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">{t("office.details.address.title")}</p>
                    <p className="text-gray-600">{t("office.details.address.line1")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-500 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">{t("office.details.hours.title")}</p>
                    <p className="text-gray-600">{t("office.details.hours.weekdays")}</p>
                    <p className="text-gray-600">{t("office.details.hours.saturday")}</p>
                    <p className="text-gray-600">{t("office.details.hours.sunday")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone className="w-5 h-5 text-green-500 mt-1" />
                  <div>
                    <p className="font-medium text-gray-900">{t("office.details.phone.title")}</p>
                    <p className="text-gray-600">{t("office.details.phone.hotline")}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-200 rounded-xl h-80 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">{t("office.mapPlaceholder")}</p>
                <p className="text-sm text-gray-400 mt-2">
                  {t("office.mapDescription")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}