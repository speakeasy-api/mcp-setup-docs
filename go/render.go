package guides

import "bytes"

// callbackURLKey is the one template key the guide corpus uses. The
// generator rejects every other key, and every other spelling of this one,
// so a plain byte substitution is enough.
var callbackURLKey = []byte("{{ gram.oauth.callback_url }}")

// Vars carries the values a consumer substitutes into guide content.
// A zero field leaves its template key in place, so a caller may call
// Render before it knows every value.
type Vars struct {
	// OAuthCallbackURL replaces {{ gram.oauth.callback_url }} — the
	// Speakeasy AI Control Plane callback URL that the reader registers
	// in the provider's redirect field. Guide.RequiresCallbackURL reports
	// whether a guide asks for this value.
	//
	// Leave it empty to keep the template key in the content. The key is
	// a valid thing to show a reader: the Control Plane resolves it later.
	OAuthCallbackURL string
}

// Render returns a copy of g whose External and Speakeasy content has the
// template keys replaced by the values in v. Meta, Assets, and every
// identity field are unchanged — no template key appears in meta.yaml or
// in an asset, and the generator fails if one ever does.
//
// Render never changes the embedded content. Each Lookup starts from the
// unrendered bytes, and rendering one copy does not affect another.
func (g Guide) Render(v Vars) Guide {
	if v.OAuthCallbackURL != "" {
		value := []byte(v.OAuthCallbackURL)
		g.External = bytes.ReplaceAll(g.External, callbackURLKey, value)
		g.Speakeasy = bytes.ReplaceAll(g.Speakeasy, callbackURLKey, value)
	}
	return g
}
