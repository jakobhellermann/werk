#![allow(clippy::must_use_candidate)]
use std::borrow::Cow;

use wasm_bindgen::prelude::*;
use werk_parser::ast::{self, RootStmt};

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Target<'a> {
    pub kind: &'static str,
    pub span: (u32, u32),
    pub target: Cow<'a, str>,
    pub doc_comment: &'a str,
}

fn get_targets_inner<'a>(root: &ast::Root) -> Vec<Target<'a>> {
    let mut targets = Vec::new();

    for stmt in &root.statements {
        // werk_parser::extract_doc_comment(source_map, file, whitespace);
        // let doc_comment = stmt.ws_pre.trim().lines().next().unwrap_or("");
        let doc_comment = "";

        match &stmt.statement {
            RootStmt::Task(command_recipe) => targets.push(Target {
                kind: "task",
                span: (command_recipe.span.start.0, command_recipe.span.end.0),
                target: command_recipe.name.ident.as_str().into(),
                doc_comment,
            }),
            RootStmt::Build(build_recipe) => targets.push(Target {
                kind: "build",
                span: (build_recipe.span.start.0, build_recipe.span.end.0),
                target: build_recipe.pattern.to_string().into(),
                doc_comment,
            }),
            _ => {}
        }
    }

    targets
}

#[wasm_bindgen]
pub fn get_targets(source_code: &str) -> Result<JsValue, JsError> {
    let ast = werk_parser::parse_werk(source_code)?;

    Ok(serde_wasm_bindgen::to_value(&get_targets_inner(&ast))?)
}
