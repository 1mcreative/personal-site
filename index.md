---
layout: home
title: "Bhavesh Nakum"
description: "Backend engineer by day, Instagram enthusiast by night. Poke around."
permalink: /
---

<section class="hero">
  <div class="hero-glow" aria-hidden="true">
    <canvas class="hero-glow-canvas"></canvas>
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

  <div class="scroll-veil" aria-hidden="true"></div>

  <div class="hero-hover-glow" aria-hidden="true"></div>

  <div class="hero-inner">
    <h1>Hi, I'm Bhavesh.</h1>
    <p class="hero-sub">I write backend systems for a living, and I'm a lot less organized about everything else. Poke around &mdash; there's more here than it looks.</p>
  </div>

  <a class="page-corner" href="/life/" aria-label="The Chaos — the personal side">
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

  <a class="scroll-cue" href="/resume/">
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 4v14M6 13l6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
    <span>keep going</span>
  </a>
</section>

<div class="scroll-runway" aria-hidden="true"></div>
<div id="hero-sentinel" class="hero-sentinel" aria-hidden="true"></div>
