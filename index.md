---
layout: home
title: "Senior Software Engineer & Backend Architect"
description: "Bhavesh Nakum: backend engineer by day, Instagram enthusiast by night. Poke around."
permalink: /
---

<section class="hero">
  <div class="intro-splash" aria-hidden="true"></div>

  <div class="hero-globe" aria-hidden="true">
    <canvas class="hero-globe-canvas"></canvas>
  </div>

  <div class="hero-blobs" aria-hidden="true">
    <div class="blob blob-a"></div>
    <div class="blob blob-b"></div>
    <div class="blob blob-c"></div>
  </div>

  <canvas class="hero-glitter" aria-hidden="true"></canvas>

  <div class="hero-stars" aria-hidden="true">
    {% assign star_positions = "8,14|18,58|24,32|31,76|37,20|44,64|52,10|58,45|64,84|70,26|76,60|82,18|88,70|93,40|14,88|46,90" | split: "|" %}
    {% for pos in star_positions %}{% assign coords = pos | split: "," %}<span class="hero-star" style="left: {{ coords[0] }}%; top: {{ coords[1] }}%; animation-delay: {{ forloop.index0 | times: 0.35 }}s;"></span>{% endfor %}
  </div>

  <div class="hero-hover-glow" aria-hidden="true"></div>

  <div class="hero-status" aria-hidden="true">
    <span class="hero-status-chip hero-clock-chip">
      <span class="hero-status-dot" aria-hidden="true"></span>
      <svg class="hero-status-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/>
        <path d="M12 7.5v4.5l3 1.8" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      <span class="hero-clock-time"></span>
    </span>
  </div>

  <canvas class="pixel-name-canvas" aria-hidden="true"></canvas>

  <div class="hero-inner">
    <h1><span class="hero-greeting">Hi, I'm </span><span class="name-kinetic-wrap"><span class="pixel-name-plain name-kinetic-plain dynamic-weight">Bhavesh</span></span><span class="hero-greeting">.</span></h1>
    <p class="hero-sub"><span class="hero-sub-text">Backend engineer by day. A lot less order everywhere else. Stick around, there's more to this site than the résumé.</span></p>
  </div>

  <a class="page-corner" href="/life/" aria-label="The Chaos, the personal side">
    <span class="page-corner-back" aria-hidden="true"></span>
    <span class="page-corner-front" aria-hidden="true"></span>
  </a>

  <a class="portal-orb" href="/life/">
    <span class="portal-orb-label">The Chaos</span>
  </a>

  <a class="spotlight-text" href="/life/">
    <span class="spotlight-dim">I left the interesting parts out of the résumé.</span>
    <span class="spotlight-bright" aria-hidden="true">I left the interesting parts out of the résumé.</span>
  </a>

  <a class="scroll-cue" href="/resume/" aria-label="Keep going to the résumé">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v14M6 13l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>keep going</span>
  </a>

  <a class="life-pull-btn" href="/life/" aria-label="See the personal side of this site">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M15 4L7 12l8 8" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </a>

  <div class="life-wipe" aria-hidden="true"></div>

  <div class="resume-wipe" aria-hidden="true"></div>

  <p class="hero-copyright">&copy; {{ 'now' | date: "%Y" }} Bhavesh Nakum</p>
</section>
