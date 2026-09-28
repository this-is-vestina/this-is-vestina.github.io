#include "common.h"
#include "common_blending.h"

// [COMBO] {"material":"ui_editor_properties_blend_mode","combo":"BLENDMODE","type":"imageblending","default":0}
// [COMBO] {"material":"Invert color","combo":"INVERTCOLOR","type":"options","default":0}
// [COMBO] {"material":"Invert value","combo":"INVERTVALUE","type":"options","default":0}
// [COMBO] {"material":"Adjust display gamma","combo":"GAMMA","type":"options","default":0}
// [COMBO] {"material":"Linear color space","combo":"LINEAR","type":"options","default":0}
// [COMBO] {"material":"Greyscale","combo":"GREYSCALE","type":"options","default":0}
// [COMBO] {"material":"Tools","combo":"TOOLS","type":"options","default":0,"options":{"Brightness and contrast":0,"Exposure and black level":1,"Luminance, Saturation and vibrance":2,"Hue, chroma and color filter":3,"Color temperature":4,"Split toning":5,"Lift-gamma-gain":6}}
// [COMBO] {"material":"Target","combo":"MODE","type":"options","default":0,"options":{"Whole image":0,"Color RGB":1,"Color HSL":2}}

uniform float u_alpha; // {"material":"Opacity","default":1,"range":[0, 1]}
uniform float u_displayInitGamma; // {"material":"Initial display gamma","default":2.2,"range":[0,16]}
uniform float u_displayGamma; // {"material":"Corrected display gamma","default":2.2,"range":[0,16]}
uniform vec3 u_channelMultiplier; // {"default":"1 1 1","material":"Channel influence"}

#if TOOLS == 0
uniform float u_brightness; // {"material":"Brightness","default":0,"range":[-1,1],"group":"Tool"}
uniform float u_contrast; // {"material":"Contrast","default":0,"range":[-1,1],"group":"Tool"}
#endif
#if TOOLS == 1
uniform float u_exposure; // {"material":"Exposure","default":0,"range":[-1,1],"group":"Tool"}
uniform float u_blackLevel; // {"material":"Black level","default":0,"range":[-1,1],"group":"Tool"}
#endif
#if TOOLS == 2
uniform float u_luminance; // {"material":"Luminance","default":0,"range":[-1,1],"group":"Tool"}
uniform float u_saturation; // {"material":"Saturation","default":0,"range":[-1,1],"group":"Tool"}
uniform float u_vibrance; // {"material":"Vibrance","default":0,"range":[-1,1],"group":"Tool"}
#endif
#if TOOLS == 3
uniform float u_hueShift; // {"material":"Hue shift","default":0,"range":[0,360],"group":"Tool"}
uniform float u_chroma; // {"material":"Chroma","default":0,"range":[-1,1],"group":"Tool"}
uniform vec3 u_colorFilter; // {"default":"1 1 1","group":"Tool","material":"Color filter","type":"color"}
#endif
#if TOOLS == 4
uniform float u_colorTemp; // {"material":"Color temperature","default":0,"range":[-1,1],"group":"Tool"}
uniform float u_whiteTint; // {"material":"White balance tint","default":0,"range":[-1,1],"group":"Tool"}
#endif
#if TOOLS == 5
uniform float u_shadows; // {"material":"Shadows","default":0,"range":[-1,1],"group":"Tool"}
uniform float u_highlights; // {"material":"Highlights","default":0,"range":[-1,1],"group":"Tool"}
uniform float u_HSbalance; // {"material":"Balance","default":0,"range":[-1,1],"group":"Tool"}
uniform vec3 u_shadowTint; // {"default":"1 1 1","group":"Tool","material":"Shadow tint","type":"color"}
uniform vec3 u_highlightTint; // {"default":"1 1 1","group":"Tool","material":"Highlight tint","type":"color"}
#endif
#if TOOLS == 6
uniform float u_gamma; // {"material":"Gamma adjustment","default":0,"range":[-1,1],"group":"Tool"}
uniform float u_gain; // {"material":"Gain adjustment","default":0,"range":[-1,1],"group":"Tool"}
uniform float u_lift; // {"material":"Lift adjustment","default":0,"range":[-1,1],"group":"Tool"}
uniform vec3 u_LiftColorFilter; // {"default":"1 1 1","group":"Tool","material":"Lift color filter","type":"color"}
uniform vec3 u_GammaColorFilter; // {"default":"1 1 1","group":"Tool","material":"Gamma color filter","type":"color"}
uniform vec3 u_GainColorFilter; // {"default":"1 1 1","group":"Tool","material":"Gain color filter","type":"color"}
#endif

uniform float u_tollerance; // {"material":"Tollerance","default":0.1,"range":[0,1],"group":"Target"}
uniform float u_smooth; // {"material":"Smooth transition","default":0.5,"range":[0,1],"group":"Target"}
#if MODE != 0
uniform vec3 u_replaceBaseColor; // {"default":"1 1 1","group":"Target","label":"Base color","material":"1baseColor","type":"color"}
#if MODE == 2
uniform float u_baseHue; // {"material":"1hue","label":"Use hue","default":1,"range":[0,1],"group":"Target"}
uniform float u_baseSaturation; // {"material":"2saturation","label":"Use saturation","default":1,"range":[0,1],"group":"Target"}
uniform float u_baseBrightness; // {"material":"3luminosity","label":"Use luminosity","default":1,"range":[0,1],"group":"Target"}
#endif
#endif

uniform sampler2D g_Texture0; // {"material":"framebuffer","label":"ui_editor_properties_framebuffer","hidden":true}
uniform sampler2D g_Texture1; // {"combo":"MASK","label":"ui_editor_properties_opacity_mask","material":"mask","mode":"opacitymask","paintdefaultcolor":"0 0 0 1"}

varying vec2 v_TexCoord;

#if GAMMA
#define startGamma u_displayInitGamma
#define endGamma u_displayGamma
#else
#define startGamma 2.2
#define endGamma 2.2
#endif
 
#define LUMA(x) dot(x, vec3(0.2126, 0.7152, 0.0722))
#if TOOLS == 4
const mat3 LIN_2_LMS_MAT = mat3(
	3.90405e-1, 5.49941e-1, 8.92632e-3,
	7.08416e-2, 9.63172e-1, 1.35775e-3,
	2.31082e-2, 1.28021e-1, 9.36245e-1
);
const mat3 LMS_2_LIN_MAT = mat3(
	2.85847e+0, -1.62879e+0, -2.48910e-2,
	-2.10182e-1, 1.15820e+0, 3.24281e-4,
	-4.18120e-2, -1.18169e-1, 1.06867e+0
);
#endif

#if TOOLS == 4
vec3 whiteBalance(vec3 color) {
	float t1 = u_colorTemp * 1.666667;
	float t2 = u_whiteTint * 1.666667;
	float x = 0.31271 - t1 * (t1 < 0.0 ? 0.1 : 0.05);
	float standardIlluminantY = 2.87 * x - 3.0 * x * x - 0.27509507;
	float y = standardIlluminantY + t2 * 0.05;
	const vec3 w1 = vec3(0.949237, 1.03542, 1.08728);
	float X = x / y;
	float Z = (1.0 - x - y) / y;
	float L = 0.7328 * X + 0.4296 - 0.1624 * Z;
	float M = -0.7036 * X + 1.6975 + 0.0061 * Z;
	float S = 0.0030 * X + 0.0136 + 0.9834 * Z;
	vec3 w2 = vec3(L, M, S);
	vec3 balance = vec3(w1.x / w2.x, w1.y / w2.y, w1.z / w2.z);
	vec3 lms = mul(LIN_2_LMS_MAT, color);
	return mul(LMS_2_LIN_MAT, lms * balance);
}
#endif

#if TOOLS == 6
vec3 liftGammaGain(vec3 color) {
	color = color + (u_LiftColorFilter * (u_lift + 1.0) / 2.0 - 0.5) * (1.0 - color);
	color = saturate(color * (1.5 - 0.5 * u_LiftColorFilter * (u_lift + 1.0)) + 0.5 * u_LiftColorFilter * (u_lift + 1.0) - 0.5);
	color *= u_GainColorFilter * pow(2.0, u_gain);
	return pow(abs(color), CAST3((1.0 / u_GammaColorFilter) * pow(2.0, -u_gamma)));
}
#endif

vec3 invertValue(vec3 color) {
	color = rgb2hsv(color);
	color.z = 1.0 - color.z;
	return hsv2rgb(color);
}

#if TOOLS == 3
vec3 hue(vec3 color) {
	const vec3 k = CAST3(0.57735);
	const float cosAngle = cos(radians(u_hueShift));
	return color * cosAngle + cross(k, color) * sin(radians(u_hueShift)) + k * dot(k, color) * (1.0 - cosAngle);
}

vec3 chroma(vec3 color) {
	color = rgb2hsv(color);
	color.y += u_chroma;
	return hsv2rgb(color);
}
#endif

#if TOOLS == 5
vec3 splitTone(vec3 color) {
	float t = saturate(LUMA(color) + u_HSbalance);
	vec3 shadows = mix(0.5, u_shadowTint * ((1.0 + u_shadows * 1.5) / 2.0), 1.0 - t);
	vec3 highlights = mix(0.5, u_highlightTint * ((1.0 + u_highlights * 1.5) / 2.0), t);
	color = BlendSoftLight(color, shadows);
	return BlendSoftLight(color, highlights);
}
#endif

#if TOOLS == 2
vec3 vibrance(vec3 color, float luma){
	float color_saturation = max(color.r, max(color.g, color.b)) - min(color.r, min(color.g, color.b));
	return mix(luma, color, (1.0 + (u_vibrance * (1.0 - (sign(u_vibrance) * color_saturation)))));
}

vec3 luminance(vec3 color, float luma) {
	color /= luma;
	color *= luma + u_luminance;
	return color;
}
#endif

#if MODE != 0
float select(vec3 rgbColor, vec3 hslColor) {
	vec3 replaceColor = LINEAR ? pow(u_replaceBaseColor, CAST3(startGamma)) : u_replaceBaseColor;

#if MODE == 1
	#define dist distance(rgbColor, replaceColor)
#endif
#if MODE == 2
	vec3 hsl = abs(hslColor - RGBToHSL(replaceColor));
	#define hueDist min(hsl.x, 1.0 - hsl.x) * u_baseHue
	#define satDist hsl.y * u_baseSaturation
	#define lumaDist hsl.z * u_baseBrightness
	#define dist hueDist + satDist + lumaDist
#endif

	return pow(u_tollerance / max(dist, 0.001), 1.0 / u_smooth);
}
#endif

void main() {
	vec4 albedo = texSample2D(g_Texture0, v_TexCoord.xy);
	vec4 baseAlbedo = albedo;
#if MASK
	float mask = texSample2D(g_Texture1, v_TexCoord.xy).r;
#else
	#define mask 1.0
#endif

	if (mask > 0.0 && u_alpha > 0.0){
#if LINEAR
		albedo.rgb = pow(albedo.rgb, CAST3(startGamma));
#endif
#if GREYSCALE
		albedo.rgb = greyscale(albedo.rgb);
#endif
#if INVERTCOLOR
		albedo.rgb = 1.0 - albedo.rgb;
#endif
#if INVERTVALUE
		albedo.rgb = invertValue(albedo.rgb);
#endif

#if MODE != 0
		vec3 hsl = RGBToHSL(albedo.rgb);
		float colorMultiplier = select(albedo.rgb, hsl);
#else
		const float colorMultiplier = 1.0;
#endif

#if TOOLS == 0
		albedo.rgb = albedo.rgb * (u_brightness + 1.0);
		albedo.rgb = (albedo.rgb - 0.5) * (u_contrast + 1.0) + 0.5;
#endif
#if TOOLS == 1
		if (u_exposure != 0.0) albedo.rgb *= pow(2.0, u_exposure);
		albedo.rgb -= u_blackLevel / 10.0;
#endif
#if TOOLS == 2
		float luma = LUMA(albedo.rgb);
		if (u_luminance != 0.0) albedo.rgb = luminance(albedo.rgb, luma);
		if (u_saturation != 0.0) albedo.rgb = mix(CAST3(luma), albedo.rgb, u_saturation + 1.0);
		if (u_vibrance != 0.0) albedo.rgb = vibrance(albedo.rgb, luma);
#endif
#if TOOLS == 3
		albedo.rgb *= u_colorFilter;
		if (u_hueShift != 0.0) albedo.rgb = hue(albedo.rgb);
		if (u_chroma != 0.0) albedo.rgb = chroma(albedo.rgb);
#endif
#if TOOLS == 4
		if (u_colorTemp != 0.0 || u_whiteTint != 0.0) {
			albedo.rgb = whiteBalance(albedo.rgb);
			albedo.rgb = mix(baseAlbedo.rgb, albedo.rgb, colorMultiplier * mask * u_alpha);
		}
#endif
#if TOOLS == 5
		albedo.rgb = splitTone(albedo.rgb);
#endif
#if TOOLS == 6
		albedo.rgb = liftGammaGain(albedo.rgb);
#endif

		albedo.rgb = mix(baseAlbedo.rgb, albedo.rgb, u_channelMultiplier * colorMultiplier * mask * u_alpha);

#if LINEAR
		albedo.rgb = pow(albedo.rgb, CAST3(1.0 / startGamma));
#endif

		albedo.rgb = ApplyBlending(BLENDMODE, baseAlbedo.rgb, albedo.rgb, mask * albedo.a * u_alpha);
		albedo.rgb = pow(albedo.rgb, CAST3(2.2 / endGamma));
	}

	gl_FragColor = albedo;
}