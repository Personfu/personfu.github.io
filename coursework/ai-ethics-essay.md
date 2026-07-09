# Accountable by Design: Bias, Responsibility, and the Ethics of Artificial Intelligence

[Your Name]

Pierce College

[Course Name and Number]

[Instructor Name]

July 9, 2026

*Note: Replace the bracketed fields above with your information. When formatting in Word, place this information on a separate APA title page, double space the paper, and use Times New Roman 12 pt or another approved font. Word count of the essay body: approximately 1,350 words.*

---

## Accountable by Design: Bias, Responsibility, and the Ethics of Artificial Intelligence

Artificial intelligence has moved out of the research lab and into the ordinary machinery of daily life. Systems built on machine learning now help decide who is approved for a loan, which resumes reach a recruiter, how patients are prioritized for care, and how long a defendant might wait for parole. These systems are attractive because they are fast, consistent, and cheap to scale, and I believe they genuinely can improve human decision making in many settings. However, the same properties that make AI powerful also make its failures dangerous. A biased human manager harms the applicants in one office, while a biased hiring model can harm applicants across an entire economy. In this essay I examine two of the ethical challenges I consider most urgent, which are bias and fairness in AI systems and the question of autonomy and accountability in high stakes decisions. I then propose the outlines of an ethical framework. My central argument is that the deepest problem with AI is not that machines make mistakes, but that they scale human bias while diffusing human responsibility, and that our response must keep identifiable people and institutions answerable for what these systems do.

## Bias and Fairness in AI Systems

Machine learning systems do not acquire values on their own. They learn statistical patterns from historical data, and history is not neutral. When the data used to train a model reflects decades of unequal policing, lending, or hiring, the model will faithfully reproduce those inequalities and present them with the false authority of mathematics. O'Neil (2016) described such systems as opaque, scalable, and damaging, and warned that their apparent objectivity makes them harder to challenge than an openly prejudiced person.

The empirical record supports this concern. An investigation of the COMPAS recidivism tool used in American courts found that Black defendants were nearly twice as likely as white defendants to be incorrectly labeled high risk, while white defendants were more likely to be incorrectly labeled low risk (Angwin et al., 2016). Buolamwini and Gebru (2018) tested commercial facial analysis products and found error rates below one percent for lighter skinned men but error rates approaching thirty five percent for darker skinned women, a disparity traced largely to unrepresentative training data. Bias can also enter through the choice of what a model is asked to predict. Obermeyer et al. (2019) studied a widely used healthcare algorithm that used medical spending as a proxy for medical need. Because less money has historically been spent on Black patients, the algorithm systematically understated how sick they were, and correcting the proxy would have more than doubled the number of Black patients flagged for additional care. Even well resourced companies have stumbled in this way. Amazon reportedly abandoned an experimental recruiting model after discovering that it penalized resumes containing indicators that the applicant was a woman, because it had learned from a decade of male dominated hiring data (Dastin, 2018).

In my opinion, these cases teach two lessons. First, bias in AI is rarely the result of malicious engineers. It is the predictable outcome of optimizing for accuracy against a biased world, which means good intentions are not a safeguard. Second, fairness is not a technical setting that can simply be switched on. Deciding whether a parole tool should equalize error rates across groups or equalize the meaning of its risk scores is a moral and political choice, and I believe it is dishonest to bury that choice inside engineering decisions where the public cannot see or contest it. Fairness questions deserve to be answered in the open, by accountable institutions, not implicitly by whoever happened to write the training pipeline.

## Autonomy and Accountability in High Stakes Decisions

The second challenge concerns what happens to responsibility when decisions are delegated to machines. Traditional accountability assumes a human decision maker who can explain a judgment and be held answerable for it. AI complicates this in two ways. Deep learning models are often opaque even to their creators, so the explanation behind a specific output may be genuinely unavailable. In addition, responsibility becomes distributed across data collectors, model developers, vendors, and end users, so when harm occurs each party can plausibly point to another. The result is a gap in which a patient denied care or a defendant denied parole has no one to appeal to except a score.

This gap is most troubling in healthcare and criminal justice, precisely the domains where AI adoption is accelerating. Research on automation bias shows that people tend to defer to automated recommendations even when those recommendations are wrong, which means a nominally advisory tool can become the de facto decision maker while the human retains only formal responsibility (O'Neil, 2016). A judge who overrides a risk score accepts personal blame if the defendant reoffends, while a judge who follows the score can deflect blame onto the system. The incentives quietly push humans out of the loop even when policy claims they remain in it.

My own view is that we should treat AI in high stakes domains the way medicine treats diagnostic instrumentation rather than the way it treats physicians. An MRI machine informs a decision, but a named clinician remains answerable for the diagnosis, and no one accepts a machine malfunction as a moral excuse. Applied to AI, this principle has concrete implications. Institutions that deploy these systems should be legally accountable for their outputs, affected individuals should have the right to a meaningful explanation and a human appeal, and systems whose reasoning cannot be adequately explained should simply not be used to deprive people of liberty, livelihood, or care. I recognize this position sacrifices some efficiency, but I would argue that a decision important enough to change the course of someone's life is important enough to have a human being who owns it.

## Future Directions and Ethical Frameworks

Because bias and diffused accountability are structural problems, I do not believe they will be solved by individual conscience alone. They require frameworks that make responsible behavior the default. Encouragingly, the outlines of such frameworks already exist. The European Union's Artificial Intelligence Act takes a risk based approach, banning a small set of unacceptable practices and imposing testing, documentation, human oversight, and transparency obligations on high risk systems such as those used in hiring, credit, and law enforcement (European Union, 2024). In the United States, the National Institute of Standards and Technology (2023) has published a voluntary AI Risk Management Framework that guides organizations to map, measure, and manage risks such as bias and lack of explainability across the entire life cycle of a system.

In my judgment, an adequate approach combines three layers. Binding regulation should set the floor for high risk applications, including mandatory bias audits by independent parties and disclosure to people affected by automated decisions, because voluntary guidance alone leaves ethics dependent on market pressure. Professional norms should do the work regulation cannot, and I would like to see software engineering move toward the culture of civil engineering, where signing off on a public facing system carries personal professional weight. Finally, public discourse and education matter, since citizens cannot contest systems they do not know exist. These obligations also imply a workforce need. The next generation of information technology professionals, including students like me, will need skills that span machine learning, data governance, security, and ethics, because the people best positioned to catch these failures are the ones building the systems.

## Conclusion

Artificial intelligence is neither a savior nor a menace. It is an amplifier that scales whatever patterns, values, and blind spots we feed into it. The evidence on biased risk scores, facial analysis, healthcare algorithms, and hiring tools shows that unexamined AI reliably reproduces historical injustice, and the dynamics of automation show how easily human responsibility dissolves behind a confident score. I remain optimistic, but my optimism is conditional. If we insist on transparency about what these systems optimize, independent testing of who they fail, and clear human accountability for what they decide, AI can make consequential decisions fairer than the purely human status quo. If we treat its outputs as neutral and its harms as nobody's fault, we will have automated our worst habits and called it progress. The technology is not the deciding factor. Our willingness to remain answerable for it is.

## References

Angwin, J., Larson, J., Mattu, S., & Kirchner, L. (2016, May 23). Machine bias. *ProPublica*. https://www.propublica.org/article/machine-bias-risk-assessments-in-criminal-sentencing

Buolamwini, J., & Gebru, T. (2018). Gender shades: Intersectional accuracy disparities in commercial gender classification. *Proceedings of Machine Learning Research, 81*, 77-91.

Dastin, J. (2018, October 10). Amazon scraps secret AI recruiting tool that showed bias against women. *Reuters*. https://www.reuters.com/article/us-amazon-com-jobs-automation-insight-idUSKCN1MK08G

European Union. (2024). Regulation (EU) 2024/1689 of the European Parliament and of the Council laying down harmonised rules on artificial intelligence (Artificial Intelligence Act). *Official Journal of the European Union*. https://eur-lex.europa.eu/eli/reg/2024/1689/oj

National Institute of Standards and Technology. (2023). *Artificial intelligence risk management framework (AI RMF 1.0)* (NIST AI 100-1). U.S. Department of Commerce. https://doi.org/10.6028/NIST.AI.100-1

Obermeyer, Z., Powers, B., Vogeli, C., & Mullainathan, S. (2019). Dissecting racial bias in an algorithm used to manage the health of populations. *Science, 366*(6464), 447-453. https://doi.org/10.1126/science.aax2342

O'Neil, C. (2016). *Weapons of math destruction: How big data increases inequality and threatens democracy*. Crown.
