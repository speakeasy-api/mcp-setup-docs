package guides

import "bytes"

// callbackURLKey is the one template key the guide corpus uses. The
// generator rejects every other key, and every other spelling of this one,
// so a plain byte substitution is enough.
var callbackURLKey = []byte("{{ gram.oauth.callback_url }}")

// Vars carries the values a consumer substitutes into guide content.
type Vars struct {
	// OAuthCallbackURL replaces {{ gram.oauth.callback_url }} — the
	// Speakeasy AI Control Plane callback URL that the reader registers
	// in the provider's redirect field.
	//
	// Supply it on every call. It is a property of the deployment, not of
	// the guide, so there is nothing to look up first: content that never
	// references it comes back unchanged.
	//
	// An empty value leaves the key in the content rather than blanking
	// it, so a missing value degrades to the unrendered content.
	OAuthCallbackURL string
}

// RenderExternal returns External with the template keys replaced by the
// values in v. Serve this rather than the raw field: the raw field still
// carries the keys. Treat the result as read-only; it may alias External.
func (g Guide) RenderExternal(v Vars) []byte { return render(g.External, v) }

// RenderSpeakeasy returns Speakeasy with the template keys replaced. See
// RenderExternal.
func (g Guide) RenderSpeakeasy(v Vars) []byte { return render(g.Speakeasy, v) }

func render(content []byte, v Vars) []byte {
	if v.OAuthCallbackURL == "" {
		return content
	}
	return bytes.ReplaceAll(content, callbackURLKey, []byte(v.OAuthCallbackURL))
}
