"use client";

import { useTranslations } from "next-intl";
import Image from "next/image";

// UI Components
import { Card, CardContent } from "@/components/ui/card";

// Icons
import {
  Users,
  Target,
  Shield,
  Zap,
  Globe,
  Heart,
  TrendingUp,
  Award,
  Clock,
  Smartphone,
} from "lucide-react";

export default function AboutPage() {
  const t = useTranslations("about");

  const stats = [
    {
      icon: Users,
      value: t("stats.users.value"),
      label: t("stats.users.label"),
    },
    {
      icon: TrendingUp,
      value: t("stats.events.value"),
      label: t("stats.events.label"),
    },
    {
      icon: Globe,
      value: t("stats.provinces.value"),
      label: t("stats.provinces.label"),
    },
    {
      icon: Award,
      value: t("stats.reliability.value"),
      label: t("stats.reliability.label"),
    },
  ];

  const features = [
    {
      icon: Zap,
      title: t("features.list.fastBooking.title"),
      description: t("features.list.fastBooking.description"),
      color: "text-yellow-500",
    },
    {
      icon: Shield,
      title: t("features.list.security.title"),
      description: t("features.list.security.description"),
      color: "text-green-500",
    },
    {
      icon: Smartphone,
      title: t("features.list.eTicket.title"),
      description: t("features.list.eTicket.description"),
      color: "text-[#2A273F]",
    },
    {
      icon: Heart,
      title: t("features.list.aiPersonal.title"),
      description: t("features.list.aiPersonal.description"),
      color: "text-yellow-600",
    },
    {
      icon: Clock,
      title: t("features.list.support.title"),
      description: t("features.list.support.description"),
      color: "text-[#3A3555]",
    },
    {
      icon: Target,
      title: t("features.list.diverse.title"),
      description: t("features.list.diverse.description"),
      color: "text-orange-500",
    },
  ];

  const teamMembers = [
    {
      id: "vinh",
      name: t("team.members.vinh.name"),
      role: t("team.members.vinh.role"),
      bio: t("team.members.vinh.bio"),
      avatar: "/images/team/dang-thanh-vinh.jpg",
    },
    {
      id: "khanh",
      name: t("team.members.khanh.name"),
      role: t("team.members.khanh.role"),
      bio: t("team.members.khanh.bio"),
      avatar: "/images/team/tran-dinh-khanh.jpg",
    },
    {
      id: "hoang",
      name: t("team.members.hoang.name"),
      role: t("team.members.hoang.role"),
      bio: t("team.members.hoang.bio"),
      avatar: "/images/team/nguyen-pham-viet-hoang.jpg",
    },
    {
      id: "ha",
      name: t("team.members.ha.name"),
      role: t("team.members.ha.role"),
      bio: t("team.members.ha.bio"),
      avatar: "/images/team/le-thy-an-ha.jpg",
    },
    {
      id: "hung",
      name: t("team.members.hung.name"),
      role: t("team.members.hung.role"),
      bio: t("team.members.hung.bio"),
      avatar: "/images/team/duong-viet-hung.jpg",
    },
  ];

  const timeline = [
    {
      year: t("timeline.events.2024.year"),
      title: t("timeline.events.2024.title"),
      description: t("timeline.events.2024.description"),
    },
    {
      year: t("timeline.events.2025.year"),
      title: t("timeline.events.2025.title"),
      description: t("timeline.events.2025.description"),
    },
    {
      year: t("timeline.events.2026.year"),
      title: t("timeline.events.2026.title"),
      description: t("timeline.events.2026.description"),
    },
  ];

  // Helper to show avatar or initials fallback
  function Avatar({ src, name }: { src?: string; name: string }) {
    const initials = name
      .split(" ")
      .map((p) => p[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    if (src) {
      return (
        <div className="relative w-20 h-20 rounded-full overflow-hidden ring-2 ring-yellow-300">
          <Image
            src={src}
            alt={name}
            fill
            sizes="80px"
            className="object-cover"
            onError={(e) => {
              // @ts-ignore
              e.currentTarget.style.display = "none";
            }}
          />
          <div className="absolute inset-0 hidden items-center justify-center bg-gray-200 text-gray-700 font-semibold">
            {initials}
          </div>
        </div>
      );
    }

    return (
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-yellow-100 to-yellow-200 text-[#2A273F] flex items-center justify-center text-xl font-semibold ring-2 ring-yellow-400 shadow-lg">
        {initials}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-yellow-50/20 to-white">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-[#2A273F] via-[#3A3555] to-[#2A273F] text-white py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-yellow-300 to-yellow-100 bg-clip-text text-transparent">
            {t("hero.title")}
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            {t("hero.subtitle")}
          </p>
          
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-12">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <div key={index} className="text-center">
                  <Icon className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                  <div className="text-3xl font-bold text-white">{stat.value}</div>
                  <div className="text-sm text-gray-300">{stat.label}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Mission & Vision */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-6">
                {t("mission.title")}
              </h2>
              <p className="text-lg text-gray-600 mb-6">
                {t("mission.content")}
              </p>
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-6 rounded-xl">
                <h3 className="text-xl font-bold text-gray-900 mb-3">{t("mission.vision.title")}</h3>
                <p className="text-gray-700">{t("mission.vision.content")}</p>
              </div>
            </div>
            <div className="relative">
              <div className="bg-gradient-to-br from-yellow-100 to-yellow-50 rounded-2xl p-8 h-96 flex items-center justify-center">
                <div className="text-center">
                  <div className="w-32 h-32 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full mx-auto mb-6 flex items-center justify-center">
                    <Heart className="w-16 h-16 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Đam mê sự kiện</h3>
                  <p className="text-gray-600">Kết nối cộng đồng qua trải nghiệm</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t("features.title")}
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`p-3 rounded-lg bg-gray-100 group-hover:bg-white transition-colors`}>
                        <Icon className={`w-6 h-6 ${feature.color}`} />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900">{feature.title}</h3>
                    </div>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">
              {t("timeline.title")}
            </h2>
          </div>

          <div className="space-y-8">
            {timeline.map((item, index) => (
              <div key={index} className="flex items-start gap-8">
                <div className="flex-shrink-0">
                  <div className="w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                    {item.year}
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">{t("team.title")}</h2>
            <p className="text-lg text-gray-600">{t("team.subtitle")}</p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.isArray(teamMembers) && teamMembers.length > 0 ? (
              teamMembers.map((m) => (
                <Card key={m.id} className="hover:shadow-xl transition-all duration-300">
                  <CardContent className="p-6">
                    <div className="flex flex-col items-center text-center">
                      <Avatar src={m.avatar} name={m.name} />
                      <h3 className="mt-4 text-lg font-semibold text-gray-900">{m.name}</h3>
                      <p className="text-sm text-yellow-700 font-medium">{m.role}</p>
                      {m.bio ? <p className="mt-3 text-sm text-gray-600">{m.bio}</p> : null}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <p className="text-gray-600 col-span-full text-center">
                Chúng tôi sẽ cập nhật danh sách team sớm.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 px-6 bg-gradient-to-r from-[#2A273F] to-[#3A3555] text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold mb-6">
            {t("cta.title")}
          </h2>
          <p className="text-xl text-gray-300 mb-8">
            {t("cta.subtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/events"
              className="bg-yellow-400 text-black px-8 py-4 rounded-lg font-semibold hover:bg-yellow-300 transition-colors"
            >
              {t("cta.buttons.events")}
            </a>
            <a 
              href="/contact"
              className="border-2 border-white text-white px-8 py-4 rounded-lg font-semibold hover:bg-white hover:text-gray-900 transition-colors"
            >
              {t("cta.buttons.organizer")}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}