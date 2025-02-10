use std::ops::Range;

#[derive(Clone, Copy)]
pub struct DiagnosticError<T, R> {
    pub repository: R,
    pub error: T,
}

impl<T, R> DiagnosticError<T, R> {
    pub fn map_err<F: FnOnce(T) -> U, U>(self, f: F) -> DiagnosticError<U, R> {
        DiagnosticError {
            repository: self.repository,
            error: f(self.error),
        }
    }
}

impl<T: Diagnostic, R: DiagnosticFileRepository + Sized> DiagnosticError<T, R> {
    pub fn display<'a>(
        &'a self,
        renderer: &'a annotate_snippets::Renderer,
    ) -> impl std::fmt::Display + 'a {
        self.error.display(&self.repository, renderer)
    }
}

impl<T: std::fmt::Debug, R> std::fmt::Debug for DiagnosticError<T, R> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.error.fmt(f)
    }
}

impl<T: Diagnostic, R: DiagnosticFileRepository> std::fmt::Display for DiagnosticError<T, R> {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        self.error.render(f, &self.repository)
    }
}

impl<T, R> std::error::Error for DiagnosticError<T, R>
where
    T: Diagnostic + std::error::Error,
    R: DiagnosticFileRepository,
{
    fn source(&self) -> Option<&(dyn std::error::Error + 'static)> {
        self.error.source()
    }
}

/// An arbitrary ID for a file in a diagnostic.
#[derive(Debug, Default, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash)]
pub struct DiagnosticFileId(pub u32);
pub struct DiagnosticLocation {
    pub file: DiagnosticFileId,
    pub span: Range<usize>,
}

/// A source file used in diagnostics reporting.
///
/// The full location of a diagnostic is the source + span.
#[derive(Clone, Copy, Debug)]
pub struct DiagnosticSource<'a> {
    pub file: &'a str,
    pub source: &'a str,
}

impl<'a> DiagnosticSource<'a> {
    #[inline]
    #[must_use]
    pub fn new(file: &'a std::path::Path, source: &'a str) -> Self {
        Self {
            file: file.to_str().unwrap_or("<invalid UTF-8 in path"),
            source,
        }
    }
}

pub trait DiagnosticFileRepository {
    fn get_source(&self, id: DiagnosticFileId) -> Option<DiagnosticSource<'_>>;
}

impl DiagnosticFileRepository for DiagnosticSource<'_> {
    fn get_source(&self, id: DiagnosticFileId) -> Option<DiagnosticSource<'_>> {
        if id == DiagnosticFileId(0) {
            Some(*self)
        } else {
            None
        }
    }
}

pub trait Diagnostic {
    fn id_prefix(&self) -> &'static str;
    fn level(&self) -> annotate_snippets::Level;

    /// Error ID.
    fn id(&self) -> u32;

    /// The title of the error (potentially with fewer details).
    fn title(&self) -> String;

    /// The contents of the actual diagnostic.
    fn snippet(&self) -> Option<DiagnosticSnippet>;

    /// "Foreign" context in separate snippets.
    fn context_snippets(&self) -> Vec<DiagnosticSnippet>;

    /// Help entries that go in the footer.
    fn help(&self) -> Vec<String>;

    fn render(
        &self,
        f: &mut std::fmt::Formatter,
        source_files: &dyn DiagnosticFileRepository,
    ) -> std::fmt::Result {
        render_diagnostic_default(
            self,
            f,
            source_files,
            &annotate_snippets::Renderer::styled(),
        )
    }

    fn display<'a>(
        &'a self,
        source_files: &'a dyn DiagnosticFileRepository,
        render: &'a annotate_snippets::Renderer,
    ) -> impl std::fmt::Display {
        Display(self, source_files, render)
    }

    fn into_diagnostic_error<R: DiagnosticFileRepository>(
        self,
        source_files: R,
    ) -> DiagnosticError<Self, R>
    where
        Self: Sized,
    {
        DiagnosticError {
            repository: source_files,
            error: self,
        }
    }
}

struct Display<'a, D: ?Sized>(
    &'a D,
    &'a dyn DiagnosticFileRepository,
    &'a annotate_snippets::Renderer,
);
impl<D: Diagnostic + ?Sized> std::fmt::Display for Display<'_, D> {
    fn fmt(&self, f: &mut std::fmt::Formatter) -> std::fmt::Result {
        render_diagnostic_default(self.0, f, self.1, self.2)
    }
}

pub struct DiagnosticSnippet {
    pub file_id: DiagnosticFileId,
    pub span: Range<usize>,
    pub message: String,
    pub info: Vec<DiagnosticAnnotationInfo>,
}

pub struct DiagnosticAnnotationInfo {
    pub span: Range<usize>,
    pub message: String,
}

pub fn render_diagnostic_default<T: Diagnostic + ?Sized>(
    diag: &T,
    f: &mut std::fmt::Formatter,
    source_files: &dyn DiagnosticFileRepository,
    renderer: &annotate_snippets::Renderer,
) -> std::fmt::Result {
    let level = diag.level();
    let id = format!("{}{:04}", diag.id_prefix(), diag.id());
    let title = diag.title();
    let diagnostic = diag.snippet();
    let context_snippets = diag.context_snippets();
    let help = diag.help();

    let message = level
        .title(&title)
        .id(&id)
        // The main snippet indicating the error.
        .snippets(diagnostic.as_ref().into_iter().filter_map(|diag| {
            source_files.get_source(diag.file_id).map(|source| {
                annotate_snippets::Snippet::source(source.source)
                    .origin(source.file)
                    .fold(true)
                    // Inline context ("while parsing" etc.)
                    .annotations(diag.info.iter().map(|info| {
                        annotate_snippets::Level::Info
                            .span(info.span.clone())
                            .label(&info.message)
                    }))
                    // The main error.
                    .annotation(level.span(diag.span.clone()).label(&diag.message))
            })
        }))
        // Further context for the diagnostic.
        .snippets(context_snippets.iter().filter_map(|context| {
            source_files.get_source(context.file_id).map(|source| {
                annotate_snippets::Snippet::source(source.source)
                    .origin(source.file)
                    .fold(true)
                    .annotation(
                        annotate_snippets::Level::Note
                            .span(context.span.clone())
                            .label(&context.message),
                    )
            })
        }))
        // Help footers
        .footers(
            help.iter()
                .map(|help| annotate_snippets::Level::Help.title(help)),
        );

    let rendered = renderer.render(message);
    std::fmt::Display::fmt(&rendered, f)
}
