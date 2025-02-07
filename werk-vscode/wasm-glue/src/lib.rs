use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub fn exported() -> Vec<String> {
    vec!["hello".into()]
}
